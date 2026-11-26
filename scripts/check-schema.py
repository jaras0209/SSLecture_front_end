#!/usr/bin/env python3
"""Check the SQL in docs/database_schema.md against a real MySQL server.

1. Builds the database from section 6 (tables) and section 7 (7.1 data, 7.2 first admin,
   7.3 demo accounts), dropping it first; runs 7.3 a second time, which must change nothing.
2. Compares the tables with section 2 and the foreign keys (and their ON DELETE actions)
   with section 4.
3. Runs each case below on its own: 'reject' cases must fail (a CHECK, unique index,
   foreign key or column type stops them), 'accept' cases must succeed. Cases run in order
   and build on each other's rows.
4. Checks scripts/backup-to-sql.py (section 9): imports scripts/fixtures/sample-backup.json
   into a database with only section 6 and 7.1, compares the rows, and checks that a
   backup with problems is refused and that the SQL refuses a database it doesn't fit.

Passwords are hashed with the `bcrypt` package (pip install bcrypt), as the import does.

Uses the `mysql` command-line client. Connection settings come from the environment:
MYSQL_HOST (default localhost), MYSQL_TCP_PORT, MYSQL_USER (default root) and MYSQL_PWD,
which the client reads itself. The database it creates (`sslecture`) is dropped first, so
never point it at a server holding real data.

    python3 scripts/check-schema.py                 # local MySQL
    MYSQL_HOST=127.0.0.1 MYSQL_PWD=root python3 scripts/check-schema.py

CI runs it against MySQL 8.4 (.github/workflows/schema.yml).
"""
import copy
import importlib.util
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOC = ROOT / 'docs' / 'database_schema.md'
SAMPLE_BACKUP = ROOT / 'scripts' / 'fixtures' / 'sample-backup.json'
DB = 'sslecture'


def mysql(sql, database=None):
    args = ['mysql', '-h', os.environ.get('MYSQL_HOST', 'localhost'), '-u', os.environ.get('MYSQL_USER', 'root'),
            '--default-character-set=utf8mb4', '--batch', '--skip-column-names']
    if database:
        args.append(database)
    return subprocess.run(args, input=sql, capture_output=True, text=True)


def section(doc, start, end):
    return doc[doc.index(start):doc.index(end)]


def sql_blocks(text):
    return '\n'.join(re.findall(r'```sql\n(.*?)```', text, re.S))


def query(sql):
    """Rows of a query on the database, as lists of strings"""
    result = mysql(sql, DB)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip())
    return [line.split('\t') for line in result.stdout.splitlines()]


def load_converter():
    spec = importlib.util.spec_from_file_location('backup_to_sql', ROOT / 'scripts' / 'backup-to-sql.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# Rows the cases share: the seeded church, student and teacher. Times are compared in UTC.
PRE = ("SET time_zone = '+00:00'; SET @c = (SELECT id FROM churches WHERE name='愛與話語'); "
       "SET @s = (SELECT id FROM users WHERE username='student'); "
       "SET @t = (SELECT id FROM users WHERE username='teacher'); ")
# A case checks a result with IF(condition, 1, FAIL): the subquery returns two rows, which is
# an error, so the case fails when the condition is false.
FAIL = '(SELECT 1 UNION SELECT 2)'

CASES = [
    ('reject', '帳號有大寫', "INSERT INTO users (username, role) VALUES ('Student2', 'student')"),
    ('reject', '帳號太短', "INSERT INTO users (username, role) VALUES ('ab', 'student')"),
    ('reject', '帳號有空格', "INSERT INTO users (username, role) VALUES ('a b c', 'student')"),
    ('accept', '帳號合法（. _ -）', "INSERT INTO users (username, role) VALUES ('a.b_c-1', 'student')"),
    ('reject', '帳號重複', "INSERT INTO users (username, role) VALUES ('student', 'student')"),
    ('reject', '不合法的角色', "INSERT INTO users (username, role) VALUES ('xyz', 'boss')"),
    ('reject', '頭像不是 https', "INSERT INTO users (username, role, avatar_url) VALUES ('av1', 'student', 'http://x/a.png')"),
    ('reject', '頭像 HTTPS 大寫', "INSERT INTO users (username, role, avatar_url) VALUES ('av2', 'student', 'HTTPS://x/a.png')"),
    ('accept', '頭像 https', "INSERT INTO users (username, role, avatar_url) VALUES ('av3', 'student', 'https://x/a.png')"),
    ('accept', '信箱 A', "INSERT INTO users (username, role, email) VALUES ('em1', 'student', 'a@x.tw')"),
    ('reject', '信箱只差大小寫', "INSERT INTO users (username, role, email) VALUES ('em2', 'student', 'A@X.tw')"),
    ('accept', '兩個帳號都沒有信箱', "INSERT INTO users (username, role) VALUES ('em3', 'student'), ('em4', 'student')"),
    ('reject', '使用者名稱超過 20 字', "INSERT INTO users (username, role, display_name) VALUES ('dn1', 'student', REPEAT('字', 21))"),
    ('accept', '使用者名稱 20 個中文字', "INSERT INTO users (username, role, display_name) VALUES ('dn2', 'student', REPEAT('字', 20))"),
    ('accept', '講師 A', "INSERT INTO lecturers (name, title, church_id, linked_user_id) VALUES ('王大明', 'pastor', @c, @t)"),
    ('reject', '同教會同名同稱謂講師', "INSERT INTO lecturers (name, title, church_id) VALUES ('王大明', 'pastor', @c)"),
    ('accept', '同名但稱謂不同', "INSERT INTO lecturers (name, title, church_id) VALUES ('王大明', 'elder', @c)"),
    ('accept', '英文名只差大小寫（區分大小寫，同前端）', "INSERT INTO lecturers (name, title, church_id) VALUES ('john', 'pastor', @c), ('John', 'pastor', @c)"),
    ('reject', '一個帳號連結兩筆講師', "INSERT INTO lecturers (name, title, church_id, linked_user_id) VALUES ('另一位', 'pastor', @c, @t)"),
    ('accept', '停用的講師不算重複', "UPDATE lecturers SET is_active = FALSE WHERE name='王大明' AND title='pastor'; INSERT INTO lecturers (name, title, church_id, linked_user_id) VALUES ('王大明', 'pastor', @c, @t)"),
    ('accept', '沒有教會的講師可同名', "INSERT INTO lecturers (name, title) VALUES ('外來講員', 'pastor'), ('外來講員', 'pastor')"),
    ('accept', '刪除帳號時講師連結設為 NULL', f"INSERT INTO users (username, role) VALUES ('tmpt', 'teacher'); INSERT INTO lecturers (name, title, church_id, linked_user_id) VALUES ('暫時', 'pastor', @c, (SELECT id FROM users WHERE username='tmpt')); DELETE FROM users WHERE username='tmpt'; SELECT IF(linked_user_id IS NULL, 1, {FAIL}) FROM lecturers WHERE name='暫時'"),
    ('reject', '聽課時間在未來（2 小時後）', "INSERT INTO listen_sessions (student_id, course_id, lecturer_name, listened_at) VALUES (@s, 'bible-01', '王', NOW(3) + INTERVAL 2 HOUR)"),
    ('accept', '聽課時間 30 分鐘後（容許誤差）', "INSERT INTO listen_sessions (student_id, course_id, lecturer_name, listened_at) VALUES (@s, 'bible-01', '王', NOW(3) + INTERVAL 30 MINUTE)"),
    ('accept', '聽課時間在過去', "INSERT INTO listen_sessions (student_id, course_id, lecturer_name, listened_at) VALUES (@s, 'bible-02', '王', '2026-01-01 10:00')"),
    ('reject', '改紀錄成未來時間', "UPDATE listen_sessions SET listened_at = NOW(3) + INTERVAL 3 HOUR, updated_at = NOW(3) WHERE course_id='bible-02'"),
    ('reject', '刪除有聽課紀錄的學員（RESTRICT）', "DELETE FROM users WHERE username='student'"),
    ('reject', '預約時間早於建立時間', "INSERT INTO booking_sessions (teacher_id, course_title, lecturer_name, proposed_at) VALUES (@t, '課', '王', NOW(3) - INTERVAL 1 DAY)"),
    ('accept', '預約未來時間', "INSERT INTO booking_sessions (id, teacher_id, course_title, lecturer_name, proposed_at) VALUES ('b1', @t, '課', '王', NOW(3) + INTERVAL 1 DAY)"),
    ('accept', '經文預設為空陣列', f"SELECT IF(JSON_LENGTH(prep_scriptures) = 0, 1, {FAIL}) FROM booking_sessions WHERE id='b1'"),
    ('accept', '經文存 JSON 陣列', "UPDATE booking_sessions SET prep_scriptures = JSON_ARRAY('約翰福音 3:16', '詩篇 23') WHERE id='b1'"),
    ('reject', '經文不是陣列', "UPDATE booking_sessions SET prep_scriptures = JSON_OBJECT('a', 1) WHERE id='b1'"),
    ('accept', '經文 100 字', "UPDATE booking_sessions SET prep_scriptures = JSON_ARRAY(REPEAT('經', 100)) WHERE id='b1'"),
    ('reject', '經文超過 100 字', "UPDATE booking_sessions SET prep_scriptures = JSON_ARRAY(REPEAT('經', 101)) WHERE id='b1'"),
    ('reject', '經文不是字串', "UPDATE booking_sessions SET prep_scriptures = JSON_ARRAY(3, 16) WHERE id='b1'"),
    ('reject', '還沒確認時間就完成', "UPDATE booking_sessions SET status='completed', updated_at=NOW(3) WHERE id='b1'"),
    ('reject', '課還沒開始就完成', "UPDATE booking_sessions SET status='completed', confirmed_at = NOW(3) + INTERVAL 1 DAY, updated_at=NOW(3) WHERE id='b1'"),
    ('accept', '課開始後完成', "UPDATE booking_sessions SET status='completed', confirmed_at = NOW(3) - INTERVAL 1 HOUR, updated_at=NOW(3) WHERE id='b1'"),
    ('reject', '不合法的預約狀態', "UPDATE booking_sessions SET status='done' WHERE id='b1'"),
    ('reject', '時長 0 分鐘', "UPDATE booking_sessions SET duration_minutes = 0 WHERE id='b1'"),
    ('reject', '不合法的出席狀態', "INSERT INTO booking_attendees (session_id, student_id, attendance_status) VALUES ('b1', @s, 'late')"),
    ('accept', '出席紀錄', "INSERT INTO booking_attendees (session_id, student_id, attendance_status) VALUES ('b1', @s, 'attended')"),
    ('reject', '同一場同一學員兩筆', "INSERT INTO booking_attendees (session_id, student_id) VALUES ('b1', @s)"),
    ('reject', '備註超過 2000 字', "UPDATE booking_sessions SET teacher_session_notes = REPEAT('字', 2001) WHERE id='b1'"),
    ('reject', '生日早於 1900', "INSERT INTO shining_projects (student_id, birthday) VALUES (@s, '1899-12-31')"),
    ('accept', '生日', "INSERT INTO shining_projects (student_id, birthday) VALUES (@s, '2012-05-01')"),
    ('reject', '一位學員兩份閃耀計畫', "INSERT INTO shining_projects (student_id) VALUES (@s)"),
    ('accept', '專題課登記', "INSERT INTO shining_lectures (shining_project_id, type, theme_name) SELECT id, 'character', '品格力 - 自律' FROM shining_projects WHERE student_id=@s"),
    ('reject', '同主題登記兩次', "INSERT INTO shining_lectures (shining_project_id, type, theme_name) SELECT id, 'character', '品格力 - 自律' FROM shining_projects WHERE student_id=@s"),
    ('accept', '主題改名（5.3 的 UPDATE JOIN）', f"UPDATE shining_lectures sl JOIN shining_projects p ON p.id = sl.shining_project_id JOIN users u ON u.id = p.student_id SET sl.theme_name = '品格力 - 自制' WHERE u.church_id = @c AND sl.type = 'character' AND sl.theme_name = '品格力 - 自律'; SELECT IF(COUNT(*) = 1, 1, {FAIL}) FROM shining_lectures WHERE theme_name = '品格力 - 自制'"),
    ('reject', '同教會重複主題', "INSERT INTO themes (church_id, type, name) VALUES (@c, 'character', '品格力 - 感謝')"),
    ('reject', '心得回覆只有空白', "INSERT INTO course_feedback (student_id, course_id, author_id, message) VALUES (@s, 'bible-01', @t, '   ')"),
    ('reject', '心得回覆空字串', "INSERT INTO course_feedback (student_id, course_id, author_id, message) VALUES (@s, 'bible-01', @t, '')"),
    ('accept', '心得回覆', "INSERT INTO course_feedback (student_id, course_id, author_id, message) VALUES (@s, 'bible-01', @t, '很好')"),
    ('reject', '教學統計年份 2019', "INSERT INTO teaching_stats (teacher_id, year) VALUES (@t, 2019)"),
    ('reject', '教學統計負數', "INSERT INTO teaching_stats (teacher_id, year, one_on_one_30) VALUES (@t, 2026, -1)"),
    ('accept', '教學統計', "INSERT INTO teaching_stats (teacher_id, year) VALUES (@t, 2026)"),
    ('reject', '同一年兩筆統計', "INSERT INTO teaching_stats (teacher_id, year) VALUES (@t, 2026)"),
    ('accept', '社群帳號', "INSERT INTO social_accounts (user_id, provider, provider_user_id) VALUES (@s, 'line', 'U4af498')"),
    ('reject', '同一個社群帳號綁兩個使用者', "INSERT INTO social_accounts (user_id, provider, provider_user_id) VALUES (@t, 'line', 'U4af498')"),
    ('reject', '同一使用者綁同平台兩次', "INSERT INTO social_accounts (user_id, provider, provider_user_id) VALUES (@s, 'line', 'U999')"),
    ('accept', 'IPv6 嘗試紀錄', "INSERT INTO auth_attempts (action, subject, ip, succeeded) VALUES ('login', 'student', '2001:0db8:85a3:0000:0000:8a2e:0370:7334', FALSE)"),
    ('reject', '不合法的嘗試動作', "INSERT INTO auth_attempts (action, ip, succeeded) VALUES ('hack', '1.2.3.4', FALSE)"),
    ('accept', '2.22 的失敗次數查詢', f"SELECT IF(COUNT(*) = 1, 1, {FAIL}) FROM auth_attempts WHERE action = 'login' AND subject = 'student' AND NOT succeeded AND attempted_at > NOW(3) - INTERVAL 15 MINUTE AND attempted_at > COALESCE((SELECT MAX(attempted_at) FROM auth_attempts WHERE action = 'login' AND subject = 'student' AND succeeded), '1000-01-01')"),
    ('accept', '5.14 台灣時間 14:30 存成 UTC 06:30', f"INSERT INTO booking_sessions (id, teacher_id, course_title, lecturer_name, proposed_at) VALUES ('b2', @t, '課', '王', CONVERT_TZ('2030-10-28 14:30', '+08:00', '+00:00')); SELECT IF(proposed_at = '2030-10-28 06:30:00' AND DATE_FORMAT(CONVERT_TZ(proposed_at, '+00:00', '+08:00'), '%Y-%m-%dT%H:%i') = '2030-10-28T14:30', 1, {FAIL}) FROM booking_sessions WHERE id='b2'"),
    ('accept', '刪除教會時邀請碼保留（SET NULL）', f"INSERT INTO churches (name) VALUES ('暫時教會'); INSERT INTO invite_codes (code, role, church_id, expires_at) VALUES ('ABC123', 'student', (SELECT id FROM churches WHERE name='暫時教會'), NOW(3) + INTERVAL 7 DAY); DELETE FROM churches WHERE name='暫時教會'; SELECT IF(church_id IS NULL, 1, {FAIL}) FROM invite_codes WHERE code='ABC123'"),
]



def main():
    doc = DOC.read_text(encoding='utf-8')
    failures = []

    version = mysql('SELECT VERSION()')
    if version.returncode != 0:
        sys.exit(f'Cannot connect to MySQL: {version.stderr.strip()}')
    print(f'MySQL {version.stdout.strip()}')

    import bcrypt  # noqa: E402 (only needed once connected)

    # 1. Build from sections 6 and 7; 7.3 can run again
    built = mysql(f'DROP DATABASE IF EXISTS {DB};\n' + sql_blocks(section(doc, '## 6. ', '## 8. ')))
    if built.returncode != 0:
        sys.exit(f'Building the database from sections 6 and 7 failed:\n{built.stderr.strip()}')
    demo = sql_blocks(section(doc, '### 7.3 ', '## 8. '))
    before = query('SELECT COUNT(*) FROM users UNION ALL SELECT COUNT(*) FROM parent_children')
    again = mysql(demo, DB)
    if again.returncode != 0 or query('SELECT COUNT(*) FROM users UNION ALL SELECT COUNT(*) FROM parent_children') != before:
        failures.append(f'7.3 run a second time: {again.stderr.strip() or "the rows changed"}')
    for username, hashed in query("SELECT username, password_hash FROM users WHERE username IN ('student', 'admin')"):
        if not bcrypt.checkpw(b'123456', hashed.encode()):
            failures.append(f'7.3: the password hash of {username} is not 123456')
    if query("SELECT must_change_password FROM users WHERE username = 'ss.admin'") != [['1']]:
        failures.append('7.2: the first admin must change the password at the first sign-in')

    # 2. Tables match section 2, foreign keys match section 4
    documented_tables = set(re.findall(r'^### 2\.\d+ `(\w+)`', section(doc, '## 2. ', '## 3. '), re.M))
    tables = set(mysql(f"SELECT table_name FROM information_schema.tables WHERE table_schema = '{DB}'")
                 .stdout.split())
    if tables != documented_tables:
        failures.append(f'tables: only in section 6 {sorted(tables - documented_tables)}, '
                        f'only in section 2 {sorted(documented_tables - tables)}')
    print(f'{len(tables)} tables')

    documented_fks, parent = set(), None
    for line in section(doc, '## 4. ', '## 5. ').splitlines():
        if m := re.match(r'^\*\*(\w+)\*\*$', line):
            parent = m.group(1)
        elif m := re.match(r'^\| `(\w+)\.(\w+)` \| `([A-Z ]+)`', line):
            documented_fks.add((parent, m.group(1), m.group(2), m.group(3)))
    rows = mysql(f"""SELECT k.referenced_table_name, k.table_name, k.column_name, r.delete_rule
        FROM information_schema.key_column_usage k
        JOIN information_schema.referential_constraints r
          ON r.constraint_schema = k.constraint_schema AND r.constraint_name = k.constraint_name
        WHERE k.table_schema = '{DB}' AND k.referenced_table_name IS NOT NULL""").stdout
    fks = {tuple(line.split('\t')) for line in rows.splitlines()}
    if fks != documented_fks:
        failures.append(f'foreign keys: only in section 6 {sorted(fks - documented_fks)}, '
                        f'only in section 4 {sorted(documented_fks - fks)}')
    print(f'{len(fks)} foreign keys')

    # 3. Constraints
    for expect, name, case_sql in CASES:
        result = mysql(PRE + case_sql, DB)
        rejected = result.returncode != 0
        if rejected != (expect == 'reject'):
            why = result.stderr.strip().splitlines()[-1] if rejected else 'it succeeded'
            failures.append(f'{name}: expected {expect}, but {why}')
    print(f'{len(CASES)} constraint cases')

    # 4. The import from a front-end backup (section 9)
    failures += check_import(doc, bcrypt)

    if failures:
        print('\nFAILED:\n' + '\n'.join(f'- {f}' for f in failures))
        sys.exit(1)
    print('OK')


def check_import(doc, bcrypt):
    failures = []
    converter = load_converter()
    backup = json.loads(SAMPLE_BACKUP.read_text(encoding='utf-8'))
    hasher = lambda password: bcrypt.hashpw(password.encode(), bcrypt.gensalt(4))  # noqa: E731 (fast for tests)
    hash_password = lambda password: hasher(password).decode()  # noqa: E731

    def convert(data):
        converter.CHURCH_VARS.clear()
        return converter.convert(data, hash_password)

    sql, problems, _notes, counts = convert(backup)
    if problems:
        return [f'import: the sample backup has problems: {problems}']
    base = f'DROP DATABASE IF EXISTS {DB};\n' + sql_blocks(section(doc, '## 6. ', '### 7.2 '))
    if (built := mysql(base)).returncode != 0:
        return [f'import: building section 6 and 7.1 failed: {built.stderr.strip()}']

    # A church the backup uses is missing: nothing is imported
    query("DELETE FROM churches WHERE name = '主大明'")
    refused = mysql(sql, DB)
    if 'import_requires_churches_from_7_1' not in refused.stderr or query('SELECT COUNT(*) FROM users') != [['0']]:
        failures.append(f'import: a missing church must stop it ({refused.stderr.strip() or "it succeeded"})')
    query("INSERT INTO churches (name) VALUES ('主大明')")

    imported = mysql(sql, DB)
    if imported.returncode != 0:
        return failures + [f'import: the sample backup was refused: {imported.stderr.strip()}']
    for table, expected in counts.items():
        where = ' WHERE is_active' if table == 'themes' else ''
        actual = int(query(f'SELECT COUNT(*) FROM {table}{where}')[0][0])
        if actual != expected:
            failures.append(f'import: {table} has {actual} rows, expected {expected}')
    spot = {
        # Taiwan time 19:30 is 11:30 UTC
        "SELECT listened_at FROM listen_sessions WHERE notes = '第一次聽，很受感動'": [['2026-08-28 11:30:00.000']],
        "SELECT is_active, password_hash IS NULL FROM users WHERE username = 'leaving'": [['0', '1']],
        "SELECT must_change_password, email FROM users WHERE username = 'mei'": [['1', 'mei@example.tw']],
        "SELECT avatar_url IS NULL FROM users WHERE username = 'lin.teacher'": [['1']],
        "SELECT login_method, password_hash IS NULL FROM users WHERE username = 'oauth_google_1'": [['google', '1']],
        "SELECT COUNT(*) FROM themes WHERE name = '品格力 - 勇氣' AND NOT is_active": [['1']],
        "SELECT u.username FROM lecturers l JOIN users u ON u.id = l.linked_user_id WHERE l.name = '林老師'": [['lin.teacher']],
        "SELECT COUNT(*) FROM booking_attendees a JOIN booking_sessions s ON s.id = a.session_id "
        "WHERE s.status = 'completed' AND a.attendance_status = 'attended'": [['1']],
    }
    for sql_query, expected in spot.items():
        if (actual := query(sql_query)) != expected:
            failures.append(f'import: {sql_query} gave {actual}, expected {expected}')
    hashed = query("SELECT password_hash FROM users WHERE username = 'mei'")[0][0]
    if not bcrypt.checkpw(b'Temp-pass-1', hashed.encode()):
        failures.append('import: mei\'s password hash does not match the password in the backup')

    # A second import is refused: the database already has accounts
    again = mysql(sql, DB)
    if 'import_requires_empty_users' not in again.stderr:
        failures.append(f'import: a second import must be refused ({again.stderr.strip() or "it succeeded"})')

    # Backups that break the database's rules are refused before any SQL is written
    def broken(change, expected):
        data = copy.deepcopy(backup)
        change(data['data'])
        found = convert(data)[1]
        if not any(expected in p for p in found):
            failures.append(f'import: expected a problem mentioning "{expected}", got {found}')

    def future_listen(d):
        d['superstart_progress_db']['student']['bible-01']['sessions'][0]['listenedAt'] = '2026-09-02T12:00'

    def duplicate_lecturer(d):
        d['superstart_lecturers_db'].append({**d['superstart_lecturers_db'][0], 'id': 'l_copy'})

    def long_notes(d):
        d['superstart_progress_db']['student']['bible-01']['sessions'][0]['notes'] = '字' * 2001

    def unknown_church(d):
        d['superstart_users_db']['mei']['church'] = '不存在的教會'

    def bad_username(d):
        d['superstart_users_db']['Mei2'] = d['superstart_users_db']['mei'] | {'email': 'other@example.tw'}

    def booking_in_past(d):
        session = next(iter(d['superstart_booking_sessions_db'].values()))
        session['proposedAt'] = '2026-08-01T10:00'

    def missing_student(d):
        d['superstart_feedback_db']['ghost'] = d['superstart_feedback_db']['student']

    broken(future_listen, '未來的時間')
    broken(duplicate_lecturer, '同名同稱謂')
    broken(long_notes, 'listen_sessions.notes')
    broken(unknown_church, '不存在的教會')
    broken(bad_username, 'Mei2')
    broken(booking_in_past, '不晚於建立時間')
    broken(missing_student, '「ghost」不存在')
    print('import from the sample backup')
    return failures


if __name__ == '__main__':
    main()
