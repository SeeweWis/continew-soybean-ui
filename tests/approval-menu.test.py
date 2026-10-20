"""Check paired dialect seeds against real frontend views and backend permission annotations."""
import re
from pathlib import Path

workspace = Path(__file__).resolve().parents[2]
backend = workspace / 'continew-soybean-admin'
frontend = workspace / 'continew-soybean-ui'
changelog = backend / 'continew-server/src/main/resources/db/changelog'
mysql = (changelog / 'mysql/plugin/plugin_approval.sql').read_text(encoding='utf-8')
postgres = (changelog / 'postgresql/plugin/plugin_approval.sql').read_text(encoding='utf-8')


def menu_rows(sql):
    return [line.replace("b'0'", 'false') for line in sql.splitlines() if re.match(r'^\(100\d\d,', line)]


rows = menu_rows(mysql)
assert rows == menu_rows(postgres), 'dialect menus must match'
assert len(rows) == 18
ids = [int(re.match(r'\((\d+)', row)[1]) for row in rows]
assert len(ids) == len(set(ids)), 'menu IDs must be unique'
permissions = set(re.findall(r"'(approval:[^']+)'", mysql))
assert len(permissions) == 13
for component in re.findall(r"'(approval/[^']+/index)'", mysql):
    assert (frontend / 'src/views' / (component + '.vue')).is_file(), component
controllers = backend / 'continew-plugin/continew-plugin-approval/src/main/java/top/continew/admin/approval/controller'
for controller in controllers.glob('*.java'):
    for permission in re.findall(r'@SaCheckPermission\("([^"]+)"\)', controller.read_text(encoding='utf-8')):
        assert permission in permissions, permission
for dialect, sql in [('mysql', mysql), ('postgresql', postgres)]:
    assert '-- changeset seewis:plugin_approval_2' in sql
    assert '-- changeset seewis:plugin_approval_3' in sql
    quote = '`' if dialect == 'mysql' else '"'
    assert sql.count('INSERT INTO ' + quote + 'sys_role_menu' + quote) == 4
    assert '-- changeset seewis:plugin_approval_5' in sql
    assert 'WHERE rm.' + quote + 'menu_id' + quote + ' = 10020' in sql
    assert 'WHERE ' + quote + 'id' + quote + ' = 10021' in sql
    assert 'DELETE FROM ' + quote + 'sys_menu' + quote + ' WHERE ' + quote + 'id' + quote + ' = 10020' in sql
    assert "r.code = 'general'" in sql
    assert "r.code = 'sys_admin'" in sql
    assert 'tenant_id' not in sql
print('PASS: paired menus, unique IDs, view files, permission annotations and role grants')
