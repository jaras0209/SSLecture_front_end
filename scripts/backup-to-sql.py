#!/usr/bin/env python3
"""Turn a backup file from the front end (管理員 → 資料備份) into SQL that loads it into MySQL.

    pip install bcrypt                     # passwords are hashed here (see below)
    python3 scripts/backup-to-sql.py sslecture-backup-2026-11-10-0930.json -o import.sql
    mysql -u <user> -p sslecture < import.sql

The mapping follows docs/database_schema.md section 9:

- The database must hold only the tables (section 6) and 7.1's data (churches, courses). The
  SQL stops without changing anything if `users` already has rows, so skip 7.2 / 7.3.
- Passwords are plain text in the backup. They are hashed with bcrypt here, and everyone must
  change theirs at the first sign-in (`must_change_password`). Accounts made by social sign-in
  have no password.
- Front-end IDs become new UUIDs; links between records follow them.
- Times chosen by people (listen time, booking times) are Taiwan time; system time stamps are
  UTC. Everything is stored in UTC.
- Before writing SQL, the data is checked against the database's rules (text lengths, dates
  that can't be in the future, duplicate lecturers, ...). If anything would be refused, the
  problems are listed and no SQL is written: fix them in the front end and export again.
- Everything runs in one transaction: if MySQL refuses a row, nothing is imported.

The backup holds everyone's passwords (plain text) and students' notes, and the SQL holds
password hashes: delete both once the import is done.
"""
import argparse
import json
import re
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

DOC = Path(__file__).resolve().parent.parent / 'docs' / 'database_schema.md'
TAIPEI = timezone(timedelta(hours=8))  # no daylight saving time in Taiwan
USERNAME = re.compile(r'^[a-z0-9._-]{3,30}$')
GENDERED = {'student', 'teacher'}
LECTURER_ROLES = {'teacher', 'pastor'}
# Lecturer titles were once stored as Chinese text (src/utils/lecturerTitle.ts)
TITLE_CODES = {'lecturer', 'pastor', 'preacher', 'elder', 'pastor_wife', 'counselor', 'guest'}
LEGACY_TITLES = {'講師': 'lecturer', '牧師': 'pastor', '傳道人': 'preacher', '傳道': 'preacher', '長老': 'elder',
                 '師母': 'pastor_wife', '輔導': 'counselor', '特約講師': 'guest'}
CHECKLISTS = {'faithPhase1': 'faith_phase1', 'faithPhase2': 'faith_phase2',
              'advancedChallenges': 'advanced_challenges'}
INSERT_ORDER = ['users', 'parent_children', 'student_assignments', 'page_restrictions', 'invite_codes',
                'lecturers', 'lecturer_courses', 'listen_sessions', 'course_feedback', 'course_feedback_reads',
                'shining_projects', 'shining_faith_checklists', 'shining_lectures', 'themes', 'teaching_stats',
                'booking_sessions', 'booking_attendees']


class Raw(str):
    """SQL written as is (a subquery), not quoted"""


def sql_value(v):
    if v is None:
        return 'NULL'
    if isinstance(v, Raw):
        return str(v)
    if isinstance(v, bool):
        return 'TRUE' if v else 'FALSE'
    if isinstance(v, int):
        return str(v)
    s = str(v).replace('\\', '\\\\').replace("'", "''").replace('\0', '\\0')
    return f"'{s}'"


CHURCH_VARS = {}  # church name -> the SQL variable holding its id (looked up once, see render())


def church_ref(name):
    # Looked up once at the start, where a church missing from the database stops the import
    # with a clear message instead of a NULL church
    if name not in CHURCH_VARS:
        CHURCH_VARS[name] = f'@church_{len(CHURCH_VARS) + 1}'
    return Raw(CHURCH_VARS[name])


def read_schema():
    """Column sizes (section 6) and the churches and courses 7.1 creates"""
    doc = DOC.read_text(encoding='utf-8')
    s6 = doc[doc.index('## 6. '):doc.index('## 7. ')]
    sizes = {}
    for table, body in re.findall(r'CREATE TABLE (\w+) \((.*?)\n\);', s6, re.S):
        for col, n in re.findall(r'^\s+(\w+)\s+VARCHAR\((\d+)\)', body, re.M):
            sizes[(table, col)] = int(n)
    s71 = doc[doc.index('### 7.1 '):doc.index('### 7.2 ')]
    churches_sql = s71[s71.index('INSERT INTO churches'):s71.index(';', s71.index('INSERT INTO churches'))]
    churches = set(re.findall(r"\('([^']+)'\)", churches_sql))
    courses_sql = s71[s71.index('INSERT INTO courses'):s71.index(';', s71.index('INSERT INTO courses'))]
    courses = set(re.findall(r"\('([\w-]+)',", courses_sql))
    return sizes, churches, courses


def stamp(value):
    """A system time stamp (ISO 8601, UTC) as stored"""
    if not value:
        return None
    dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]


def wall(value):
    """A time someone chose ('2026-10-28T14:30', Taiwan time), stored in UTC"""
    if not value:
        return None
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=TAIPEI)
    return dt.astimezone(timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]


def text(value):
    """Optional text: empty means none"""
    value = (value or '').strip() if isinstance(value, str) else value
    return value or None


def convert(backup, hash_password):
    """The SQL, the problems that stop the import, notes, and the rows per table"""
    sizes, known_churches, known_courses = read_schema()
    data = backup.get('data', {})
    exported = datetime.fromisoformat(backup['exportedAt'].replace('Z', '+00:00')).astimezone(TAIPEI).date()
    problems, notes = [], []
    rows = {t: [] for t in INSERT_ORDER}
    ids = {}  # (kind, front-end id) -> UUID

    def new_id(kind, old):
        ids[(kind, old)] = str(uuid.uuid4())
        return ids[(kind, old)]

    def church(name, where, required=False):
        if not name:
            if required:
                problems.append(f'{where}：沒有教會')
            return None
        if name not in known_churches:
            problems.append(f'{where}：教會「{name}」不在 7.1 的教會清單裡')
            return None
        return church_ref(name)

    users = data.get('superstart_users_db', {})
    retired = [u for u in data.get('superstart_retired_usernames', []) if u not in users]

    def user(username, where, required=True):
        if username in users or username in retired:
            return ids[('user', username)]
        if required:
            problems.append(f'{where}：帳號「{username}」不存在')
        elif username:
            notes.append(f'{where}：帳號「{username}」不存在，改為空白')
        return None

    # ── Accounts ──
    emails = {}
    social = needs_password = 0
    for username, u in users.items():
        where = f'帳號 {username}'
        if not USERNAME.match(username):
            problems.append(f'{where}：帳號名稱不合規則（小寫英數字與 . _ -，3–30 字）')
        role = u.get('role')
        login = u.get('loginMethod') or 'credentials'
        password = u.get('passwordHash') or ''
        is_social = login != 'credentials' or not password
        email = (u.get('email') or '').strip().lower() or None
        if email:
            if email in emails:
                problems.append(f'{where}：信箱 {email} 與帳號 {emails[email]} 重複')
            emails[email] = username
        avatar = text(u.get('avatarUrl'))
        if avatar and not avatar.startswith('https://'):
            notes.append(f'{where}：頭像不是 https:// 網址，不匯入（顯示預設頭像）')
            avatar = None
        if is_social:
            social += 1
        else:
            needs_password += 1
        rows['users'].append({
            'id': new_id('user', username), 'username': username,
            'password_hash': None if is_social else hash_password(password),
            'role': role,
            'church_id': None if role == 'admin' else church(u.get('church'), where),
            'display_name': text(u.get('displayName')), 'real_name': text(u.get('realName')),
            'gender': u.get('gender') if role in GENDERED else None,
            'email': email, 'must_change_password': not is_social,
            'avatar_url': avatar, 'login_method': login, 'last_login_at': stamp(u.get('lastLoginAt')),
        })
    for username in retired:
        if not USERNAME.match(username):
            problems.append(f'已刪除的帳號 {username}：帳號名稱不合規則')
        rows['users'].append({'id': new_id('user', username), 'username': username, 'role': 'student',
                              'login_method': 'credentials', 'is_active': False})
    if social:
        notes.append(f'{social} 個社群登入的帳號沒有密碼；備份裡沒有 Google / LINE 的使用者 ID，'
                     '他們第一次以社群登入時須依社群登入文件的規則綁定（相同且已驗證的信箱）')
    notes.append(f'{needs_password} 個帳號的密碼已雜湊，第一次登入時須更換密碼')
    if retired:
        notes.append(f'{len(retired)} 個已刪除的帳號以停用帳號保留名稱，不能再被註冊')

    # ── Parent bindings, caretakers, page restrictions ──
    for parent, u in users.items():
        for child in u.get('childUsernames') or []:
            if u.get('role') != 'parent' or users.get(child, {}).get('role') != 'student':
                notes.append(f'家長綁定 {parent} → {child}：不是家長與學員，不匯入')
                continue
            rows['parent_children'].append({'parent_id': ids[('user', parent)], 'student_id': ids[('user', child)]})
    for student, c in data.get('superstart_student_teacher_db', {}).items():
        where = f'學員 {student} 的關懷配對'
        sid = user(student, where, required=False)
        teacher = user(c.get('teacher'), where, required=False) if c.get('teacher') else None
        pastor = user(c.get('pastor'), where, required=False) if c.get('pastor') else None
        if sid and (teacher or pastor):
            rows['student_assignments'].append({'id': str(uuid.uuid4()), 'student_id': sid,
                                                'teacher_id': teacher, 'pastor_id': pastor})
    for username, pages in data.get('superstart_restrictions_db', {}).items():
        uid = user(username, f'帳號 {username} 的頁面限制', required=False)
        for page in dict.fromkeys(pages) if uid else []:
            rows['page_restrictions'].append({'id': str(uuid.uuid4()), 'user_id': uid, 'page_path': page})

    # ── Invite codes ──
    for code, inv in data.get('superstart_invite_codes', {}).items():
        where = f'邀請碼 {code}'
        rows['invite_codes'].append({
            'code': code, 'role': inv.get('role'),
            'church_id': church(inv.get('church'), where) if inv.get('role') != 'admin' else None,
            'created_by': user(inv.get('createdBy'), where, required=False),
            'created_at': stamp(inv.get('createdAt')), 'expires_at': stamp(inv.get('expiresAt')),
            'used_by': user(inv.get('usedBy'), where, required=False) if inv.get('usedBy') else None,
            'used_at': stamp(inv.get('usedAt')), 'revoked': bool(inv.get('revoked')),
        })

    # ── Lecturers ──
    seen_names, seen_links = {}, {}
    for lec in data.get('superstart_lecturers_db', []):
        name = (lec.get('name') or '').strip()
        where = f'講師 {name}'
        title = (lec.get('title') or '').strip()
        if title not in TITLE_CODES and title in LEGACY_TITLES:
            title = LEGACY_TITLES[title]
        key = (lec.get('church'), name, title)
        if key in seen_names:
            problems.append(f'{where}：同教會已有同名同稱謂的講師（合併成一筆後再匯出，見 2.4）')
        seen_names[key] = True
        linked = lec.get('linkedUsername')
        link_id = None
        if linked:
            if users.get(linked, {}).get('role') not in LECTURER_ROLES:
                notes.append(f'{where}：連結的帳號 {linked} 不是教師或牧者，不連結')
            elif linked in seen_links:
                problems.append(f'{where}：帳號 {linked} 已連結講師 {seen_links[linked]}（一個帳號只連結一筆）')
            else:
                seen_links[linked] = name
                link_id = ids[('user', linked)]
        lid = new_id('lecturer', lec.get('id'))
        rows['lecturers'].append({'id': lid, 'name': name, 'title': title,
                                  'church_id': church(lec.get('church'), where), 'linked_user_id': link_id})
        for course in dict.fromkeys(lec.get('courseIds') or []):
            if course in known_courses:
                rows['lecturer_courses'].append({'lecturer_id': lid, 'course_id': course})
            else:
                notes.append(f'{where}：課程 {course} 不存在，略過')

    # ── Listen sessions, feedback ──
    def course(course_id, where):
        if course_id not in known_courses:
            problems.append(f'{where}：課程 {course_id} 不存在')
        return course_id

    for student, records in data.get('superstart_progress_db', {}).items():
        for course_id, record in records.items():
            where = f'學員 {student} 的聽課紀錄（{course_id}）'
            sid = user(student, where)
            course(course_id, where)
            for s in record.get('sessions') or []:
                listened, created = wall(s.get('listenedAt')), stamp(s.get('createdAt'))
                if not listened:
                    problems.append(f'{where}：沒有聽課時間')
                elif created and datetime.fromisoformat(listened) > datetime.fromisoformat(created) + timedelta(hours=1):
                    problems.append(f'{where}：聽課時間 {s.get("listenedAt")} 晚於登記時間（未來的時間，見 5.17）')
                rows['listen_sessions'].append({
                    'id': new_id('listen', s.get('id')), 'student_id': sid, 'course_id': course_id,
                    'lecturer_name': (s.get('lecturer') or '').strip(), 'listened_at': listened,
                    'notes': text(s.get('notes')), 'created_at': created,
                })
    for student, courses in data.get('superstart_feedback_db', {}).items():
        for course_id, items in courses.items():
            where = f'學員 {student} 的心得回覆（{course_id}）'
            sid = user(student, where)
            course(course_id, where)
            for f in items:
                if not (f.get('message') or '').strip():
                    problems.append(f'{where}：回覆是空白的')
                rows['course_feedback'].append({
                    'id': str(uuid.uuid4()), 'student_id': sid, 'course_id': course_id,
                    'author_id': user(f.get('author'), where), 'message': f.get('message'),
                    'created_at': stamp(f.get('createdAt')),
                })
    for student, courses in data.get('superstart_feedback_seen_db', {}).items():
        for course_id, seen in courses.items():
            where = f'學員 {student} 的回覆已讀（{course_id}）'
            rows['course_feedback_reads'].append({'student_id': user(student, where),
                                                  'course_id': course(course_id, where), 'seen_up_to': stamp(seen)})

    # ── Shining project, themes ──
    def check_date(value, where, earliest=None):
        if not value:
            return None
        d = date.fromisoformat(value)
        if d > exported:
            problems.append(f'{where}：{value} 晚於匯出當天（未來的日期，見 5.17）')
        if earliest and d < earliest:
            problems.append(f'{where}：{value} 早於 {earliest}')
        return value

    for student, p in data.get('superstart_shining_project_db', {}).items():
        where = f'學員 {student} 的閃耀計畫'
        pid = str(uuid.uuid4())
        rows['shining_projects'].append({
            'id': pid, 'student_id': user(student, where), 'name': text(p.get('name')),
            'birthday': check_date(p.get('birthday'), f'{where}的生日', date(1900, 1, 1)),
            'church_name': text(p.get('church')), 'school_grade': text(p.get('schoolGrade')),
            'custom_challenge': text(p.get('customChallenge')),
        })
        for key, category in CHECKLISTS.items():
            for item, checked in (p.get(key) or {}).items():
                rows['shining_faith_checklists'].append({'id': str(uuid.uuid4()), 'shining_project_id': pid,
                                                         'category': category, 'item_key': item,
                                                         'is_checked': bool(checked)})
        for key, kind in (('characterLectures', 'character'), ('comingOfAgeTopics', 'coming_of_age')):
            for theme, lecture in (p.get(key) or {}).items():
                rows['shining_lectures'].append({
                    'id': str(uuid.uuid4()), 'shining_project_id': pid, 'type': kind, 'theme_name': theme,
                    'speaker_name': text(lecture.get('speaker')),
                    'lecture_date': check_date(lecture.get('date'), f'{where}的專題課「{theme}」日期'),
                })
    theme_churches = set()
    for key, kind in (('superstart_character_themes_db', 'character'),
                      ('superstart_coming_of_age_themes_db', 'coming_of_age')):
        for church_name, names in data.get(key, {}).items():
            cid = church(church_name, f'{church_name} 的專題主題')
            theme_churches.add(church_name)
            for order, name in enumerate(dict.fromkeys(names), start=1):
                rows['themes'].append({'id': str(uuid.uuid4()), 'church_id': cid, 'type': kind,
                                       'name': name, 'sort_order': order})

    # ── Teaching stats ──
    for s in data.get('superstart_teaching_stats_db', {}).values():
        where = f'教師 {s.get("teacherUsername")} 的 {s.get("year")} 年教學統計'
        counts = {col: s.get(key, 0) for col, key in (('one_on_one_30', 'oneOnOne30'), ('one_to_many_30', 'oneToMany30'),
                                                      ('one_on_one_shining', 'oneOnOneShining'),
                                                      ('one_to_many_shining', 'oneToManyShining'))}
        if (s.get('year') or 0) < 2020 or any(v < 0 for v in counts.values()):
            problems.append(f'{where}：年份須在 2020 以後、人次不可為負數')
        rows['teaching_stats'].append({'id': str(uuid.uuid4()), 'teacher_id': user(s.get('teacherUsername'), where),
                                       'year': s.get('year'), **counts, 'submitted_at': stamp(s.get('submittedAt'))})

    # ── Bookings ──
    lecturer_ids = {old: new for (kind, old), new in ids.items() if kind == 'lecturer'}
    for old_id, b in data.get('superstart_booking_sessions_db', {}).items():
        where = f'預約 {b.get("courseTitle")}（{b.get("proposedAt")}）'
        proposed, confirmed = wall(b.get('proposedAt')), wall(b.get('confirmedAt'))
        created, updated = stamp(b.get('createdAt')), stamp(b.get('updatedAt'))
        if not proposed or not created:
            problems.append(f'{where}：沒有提議或建立的時間')
        elif proposed <= created:
            problems.append(f'{where}：提議的時間不晚於建立時間（見 5.17）')
        if b.get('status') == 'completed' and (not confirmed or confirmed > updated):
            problems.append(f'{where}：已完成，但時間沒有確認或課還沒開始（見 5.17）')
        course_id = b.get('courseId')
        if course_id and course_id not in known_courses:
            notes.append(f'{where}：課程 {course_id} 不存在，只保留課程名稱')
            course_id = None
        lecturer_id = lecturer_ids.get(b.get('lecturerId'))
        if b.get('lecturerId') and not lecturer_id:
            notes.append(f'{where}：講師已刪除，只保留講師名稱')
        duration = b.get('durationMinutes')
        title = (b.get('lecturerTitle') or '').strip()
        prep = b.get('prep') or {}
        rows['booking_sessions'].append({
            'id': new_id('booking', old_id), 'teacher_id': user(b.get('teacherUsername'), where),
            'church_id': church(b.get('church'), where), 'course_id': course_id or None,
            'course_title': b.get('courseTitle'), 'lecturer_id': lecturer_id, 'lecturer_name': b.get('lecturerName'),
            'lecturer_title': LEGACY_TITLES.get(title, title),
            'proposed_at': proposed, 'confirmed_at': confirmed,
            'duration_minutes': duration if isinstance(duration, int) and duration >= 1 else None,
            'status': b.get('status'), 'cancel_reason': text(b.get('cancelReason')),
            'teacher_session_notes': text(b.get('teacherSessionNotes')),
            'is_group_session': bool(b.get('isGroupSession')),
            'prep_scriptures': json.dumps([s for s in prep.get('scriptures') or [] if s.strip()], ensure_ascii=False),
            'prep_reading_notes': text(prep.get('readingNotes')), 'prep_materials': text(prep.get('materials')),
            'created_at': created, 'updated_at': updated,
        })
        for scripture in prep.get('scriptures') or []:
            if len(scripture) > 100:
                problems.append(f'{where}：預習經文超過 100 字')
    for a in data.get('superstart_booking_attendees_db', {}).values():
        where = f'預約的學員 {a.get("studentUsername")}'
        session_id = ids.get(('booking', a.get('sessionId')))
        if not session_id:
            notes.append(f'{where}：預約已不存在，略過')
            continue
        linked = a.get('linkedListenSessionId')
        rows['booking_attendees'].append({
            'session_id': session_id, 'student_id': user(a.get('studentUsername'), where),
            'attendance_status': a.get('attendanceStatus'), 'student_feedback': text(a.get('studentFeedback')),
            'teacher_feedback': text(a.get('teacherFeedback')), 'feedback_at': stamp(a.get('feedbackAt')),
            'linked_listen_session_id': ids.get(('listen', linked)) if linked else None,
            'created_at': stamp(a.get('createdAt')), 'updated_at': stamp(a.get('updatedAt')),
        })

    # ── Text lengths (section 6's column sizes, which the front end shares) ──
    for table, table_rows in rows.items():
        for row in table_rows:
            for col, value in row.items():
                limit = sizes.get((table, col))
                if limit and isinstance(value, str) and not isinstance(value, Raw) and len(value) > limit:
                    label = row.get('username') or row.get('name') or row.get('code') or ''
                    problems.append(f'{table}.{col}{f"（{label}）" if label else ""}：{len(value)} 字，超過上限 {limit} 字')

    return render(rows, theme_churches, backup), problems, notes, {t: len(r) for t, r in rows.items()}


def render(rows, theme_churches, backup):
    out = [
        f'-- 由 scripts/backup-to-sql.py 從前端備份（匯出時間 {backup["exportedAt"]}）產生。',
        '-- 以 mysql 用戶端執行（不要加 --force）：任何一列被拒絕時，整個交易都不會生效。',
        '-- 內含密碼雜湊，匯入後請刪除這個檔案與備份檔。',
        'SET NAMES utf8mb4;',
        "SET time_zone = '+00:00';",
        'START TRANSACTION;',
        '',
        '-- 只能匯入到還沒有帳號的資料庫（只執行過第 6 節與 7.1）',
        'CREATE TEMPORARY TABLE import_guard (',
        '  users_before_import INT,',
        '  CONSTRAINT import_requires_empty_users CHECK (users_before_import = 0)',
        ');',
        'INSERT INTO import_guard SELECT COUNT(*) FROM users;',
    ]
    if CHURCH_VARS:
        # Each church the backup uses, looked up once; all must exist (7.1)
        out += ['', 'CREATE TEMPORARY TABLE import_churches (',
                '  church VARCHAR(100),', '  church_id CHAR(36),',
                '  CONSTRAINT import_requires_churches_from_7_1 CHECK (church_id IS NOT NULL)', ');']
        for name, var in CHURCH_VARS.items():
            out.append(f'SET {var} = (SELECT id FROM churches WHERE name = {sql_value(name)});')
        out.append('INSERT INTO import_churches VALUES\n' + ',\n'.join(
            f'  ({sql_value(name)}, {var})' for name, var in CHURCH_VARS.items()) + ';')
    for table in INSERT_ORDER:
        table_rows = rows[table]
        if table == 'themes' and theme_churches:
            # The backup's themes replace 7.1's examples for those churches (removed ones are soft-deleted)
            names = ', '.join(sql_value(n) for n in sorted(theme_churches))
            out += ['', f'UPDATE themes SET is_active = FALSE WHERE church_id IN (SELECT id FROM churches WHERE name IN ({names}));']
        if not table_rows:
            continue
        columns = list(dict.fromkeys(c for r in table_rows for c in r))
        for start in range(0, len(table_rows), 500):
            # A column a row doesn't set gets its default (e.g. is_active for active accounts)
            values = ',\n'.join('  (' + ', '.join(sql_value(r[c]) if c in r else 'DEFAULT' for c in columns) + ')'
                                for r in table_rows[start:start + 500])
            out += ['', f'INSERT INTO {table} ({", ".join(columns)}) VALUES', values]
            if table == 'themes':
                out[-1] += '\nAS new ON DUPLICATE KEY UPDATE sort_order = new.sort_order, is_active = TRUE'
            out[-1] += ';'
    out += ['', 'DROP TEMPORARY TABLE import_guard;']
    if CHURCH_VARS:
        out.append('DROP TEMPORARY TABLE import_churches;')
    out += ['COMMIT;', '']
    return '\n'.join(out)


def bcrypt_hasher():
    try:
        import bcrypt
    except ImportError:
        sys.exit('需要 bcrypt 套件來雜湊密碼：pip install bcrypt')
    return lambda password: bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()


def main():
    parser = argparse.ArgumentParser(description='把前端的備份檔轉成匯入 MySQL 的 SQL（見 docs/database_schema.md 第 9 節）')
    parser.add_argument('backup', help='前端匯出的備份檔（.json）')
    parser.add_argument('-o', '--output', help='寫入的 SQL 檔（預設輸出到畫面）')
    args = parser.parse_args()

    backup = json.loads(Path(args.backup).read_text(encoding='utf-8'))
    if backup.get('app') != 'sslecture' or backup.get('version') != 1 or 'superstart_users_db' not in backup.get('data', {}):
        sys.exit('這不是 SSLecture 的備份檔（或是較新的版本）')
    sql, problems, notes, counts = convert(backup, bcrypt_hasher())

    for note in notes:
        print(f'說明：{note}', file=sys.stderr)
    if problems:
        print(f'\n有 {len(problems)} 筆資料不符合資料庫的規則，沒有產生 SQL。請在前端修正後重新匯出：', file=sys.stderr)
        for problem in problems:
            print(f'- {problem}', file=sys.stderr)
        sys.exit(1)
    if args.output:
        Path(args.output).write_text(sql, encoding='utf-8')
    else:
        sys.stdout.write(sql)
    print('\n筆數：' + '、'.join(f'{t} {n}' for t, n in counts.items() if n), file=sys.stderr)


if __name__ == '__main__':
    main()
