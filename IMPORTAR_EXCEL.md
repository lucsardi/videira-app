# 📥 Importando sua planilha de Excel

Você não precisa digitar tudo de novo. Siga esse caminho:

## Passo 1 — Organize seu Excel
Deixe sua planilha com estas colunas (nessa ordem, nomes exatamente assim na primeira linha).
Use o arquivo `modelo_importacao.csv` (nesta pasta) como exemplo/modelo:

| full_name | birth_day | birth_month | connection_name | is_leader | wedding_day | wedding_month | spouse_name |
|---|---|---|---|---|---|---|---|
| Maria Souza | 12 | 5 | Conexão Vila Nova | FALSE | | | |
| João Pastor | 3 | 8 | Conexão Centro | TRUE | 20 | 11 | Ana Pastor |

- `connection_name` precisa ter o nome **exatamente igual** ao que vai estar cadastrado na tabela `connections`
- `is_leader`, `wedding_day`, `wedding_month`, `spouse_name` são opcionais — deixe em branco se não usar
- No Excel: **Arquivo → Salvar como → CSV (separado por vírgulas)**

## Passo 2 — Garanta que todas as conexões já existem
No Supabase, rode no **SQL Editor** (ajuste os nomes para os da sua igreja):
```sql
insert into connections (name) values
  ('Conexão Vila Nova'),
  ('Conexão Centro')
on conflict (name) do nothing;
```

## Passo 3 — Crie uma tabela temporária para receber o CSV
No **SQL Editor**, rode:
```sql
create table import_temp (
  full_name text,
  birth_day int,
  birth_month int,
  connection_name text,
  is_leader boolean,
  wedding_day int,
  wedding_month int,
  spouse_name text
);
```

## Passo 4 — Importe o CSV
1. Vá em **Table Editor** → selecione a tabela `import_temp`
2. Clique em **Insert → Import data from CSV**
3. Selecione seu arquivo CSV e confirme

## Passo 5 — Passe os dados da tabela temporária para a tabela final
No **SQL Editor**:
```sql
insert into people (full_name, birth_day, birth_month, connection_id, is_leader, wedding_day, wedding_month, spouse_name)
select
  t.full_name,
  t.birth_day,
  t.birth_month,
  c.id,
  coalesce(t.is_leader, false),
  t.wedding_day,
  t.wedding_month,
  t.spouse_name
from import_temp t
left join connections c on c.name = t.connection_name;
```

## Passo 6 — Confira e limpe
Abra o app, vá em **Membros** e confira se todo mundo entrou certo. Se estiver tudo certo, apague a tabela temporária:
```sql
drop table import_temp;
```

Pronto — sua lista inteira estará no app, com aniversários e conexões corretos.
