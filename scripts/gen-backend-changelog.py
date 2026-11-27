#!/usr/bin/env python3
"""Write SSLecture_backend's Liquibase changesets from docs/database_schema.md, or check them.

The backend's first changesets are the SQL in this repository's schema document, which CI builds
and tests on MySQL 8.4 (scripts/check-schema.py):

    001-schema.sql               section 6, one changeset per table (with its indexes)
    002-seed-reference-data.sql  7.1: churches, courses, example themes (all environments)
    003-seed-dev-users.sql       7.3: the demo accounts (context dev,test)

    python3 scripts/gen-backend-changelog.py ../SSLecture_backend/src/main/resources/db/changelog/changes
    python3 scripts/gen-backend-changelog.py --check <that directory>

--check writes nothing: it fails, naming the files, when the backend's files differ from what the
document gives (CI: .github/workflows/schema.yml, against the backend's main). Change the document
and run this to update the backend, never the other way round.

Once a database runs in production, its changesets must not change any more: from then on,
structure changes are new changesets (004 and on) and section 6 shows the result, so this check
stops applying to 001-003 then.
"""
import argparse
import difflib
import re
import sys
from pathlib import Path

DOC = Path(__file__).resolve().parent.parent / 'docs' / 'database_schema.md'

HEADER = """--liquibase formatted sql

-- ═════════════════════════════════════════════════════════════════════════════
-- {title}
-- 由前端 docs/database_schema.md 產生（SSLecture_front_end 的 scripts/gen-backend-changelog.py），內容與文件相同；
-- 文件的 SQL 由前端 CI 在 MySQL 8.4 實測（scripts/check-schema.py），前端 CI 也比對這些檔案與文件是否一致。
-- 上線後不修改已執行的 changeset：結構變更新增 changeset，並同步更新前端文件第 6 節。
-- ═════════════════════════════════════════════════════════════════════════════
"""


def sql_blocks(text):
    return re.findall(r'```sql\n(.*?)```', text, re.S)


def section(doc, start, end):
    return doc[doc.index(start):doc.index(end)]


def statements(sql):
    """(leading comment lines, statement) pairs, split at a ';' that ends a line"""
    out, comments, current = [], [], []
    for line in sql.splitlines():
        if not current and (line.startswith('--') or not line.strip()):
            # keep real comments, not the ═══ / ─── rules
            if line.startswith('--') and not set(line) <= set('-═─ '):
                comments.append(line)
            continue
        current.append(line)
        if line.rstrip().endswith(';') and not line.lstrip().startswith('--'):
            out.append((comments, '\n'.join(current)))
            comments, current = [], []
    if current:
        sys.exit(f'section 6 ends inside a statement: {current[0]}')
    return out


def schema_file(doc):
    """001: one changeset per table, with the indexes that follow it"""
    groups = []
    for comments, stmt in statements(sql_blocks(section(doc, '## 6. ', '## 7. '))[0]):
        if re.match(r'(CREATE DATABASE|USE)\b', stmt):
            continue  # the backend runs on a database that already exists
        if m := re.match(r'CREATE TABLE (\w+)', stmt):
            groups.append((m.group(1), []))
        # drop the "--  12. page_restrictions（…）" headings: the changeset id says it
        kept = '\n'.join(c for c in comments if not re.match(r'--\s+\d+\. ', c))
        groups[-1][1].append((kept, stmt))
    parts = [HEADER.format(title='資料表（文件第 6 節）：22 張表與索引')]
    for table, stmts in groups:
        body = '\n'.join((c + '\n' if c else '') + s for c, s in stmts)
        parts.append(f'\n--changeset sslecture:001-{table.replace("_", "-")}\n{body}\n'
                     f'--rollback DROP TABLE {table};\n')
    return ''.join(parts)


def reference_file(doc):
    """002: 7.1, one changeset per part (churches, courses, themes)"""
    block = sql_blocks(section(doc, '### 7.1 ', '### 7.2 '))[0].strip('\n')
    chunks = re.split(r'\n(?=-- ─+\n--  )', block)
    names = [('churches', 'DELETE FROM churches;'), ('courses', 'DELETE FROM courses;'),
             ('themes', 'DELETE FROM themes;')]
    if len(chunks) != len(names):
        sys.exit(f'7.1 has {len(chunks)} parts, expected {len(names)} (churches, courses, themes)')
    parts = [HEADER.format(title='正式資料（文件 7.1）：教會、課程、專題主題範例。所有環境都執行')]
    for chunk, (name, rollback) in zip(chunks, names):
        parts.append(f'\n--changeset sslecture:002-{name}\n{chunk.strip()}\n--rollback {rollback}\n')
    return ''.join(parts)


def demo_file(doc):
    """003: 7.3, only in dev and test"""
    demo = sql_blocks(section(doc, '### 7.3 ', '## 8. '))[0].strip()
    return (HEADER.format(title='示範帳號（文件 7.3）：只在 dev、test 執行，密碼皆為 123456')
            + f'\n--changeset sslecture:003-demo-accounts context:dev,test\n{demo}\n'
            + "--rollback DELETE FROM parent_children; DELETE FROM users WHERE username IN "
              "('student', 'teacher', 'pastor', 'parent', 'admin');\n")


def generate():
    doc = DOC.read_text(encoding='utf-8')
    return {
        '001-schema.sql': schema_file(doc),
        '002-seed-reference-data.sql': reference_file(doc),
        '003-seed-dev-users.sql': demo_file(doc),
    }


def main():
    parser = argparse.ArgumentParser(description='SSLecture_backend 的 Liquibase changeset 由前端的資料庫文件產生')
    parser.add_argument('directory', help='後端的 src/main/resources/db/changelog/changes')
    parser.add_argument('--check', action='store_true', help='只比對，不寫入；不同時失敗')
    args = parser.parse_args()
    target = Path(args.directory)
    if not target.is_dir():
        sys.exit(f'{target} is not a directory')

    different = []
    for name, content in generate().items():
        path = target / name
        current = path.read_text(encoding='utf-8') if path.exists() else ''
        if current == content:
            continue
        different.append(name)
        if args.check:
            diff = difflib.unified_diff(current.splitlines(), content.splitlines(),
                                        f'backend/{name}', f'from docs/database_schema.md', lineterm='', n=1)
            print('\n'.join(list(diff)[:40]))
        else:
            path.write_text(content, encoding='utf-8')

    if args.check and different:
        print(f'\nThe backend changelog differs from docs/database_schema.md: {", ".join(different)}.\n'
              'Run scripts/gen-backend-changelog.py against the backend and commit the result there '
              '(or, if the backend is right, change the document).')
        sys.exit(1)
    print('up to date' if args.check else (f'wrote {", ".join(different)}' if different else 'already up to date'))


if __name__ == '__main__':
    main()
