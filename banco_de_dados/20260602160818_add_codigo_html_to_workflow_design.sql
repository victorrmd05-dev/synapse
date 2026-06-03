-- Adiciona a coluna para armazenar o código HTML bruto das páginas
ALTER TABLE workflow_design 
ADD COLUMN IF NOT EXISTS codigo_html TEXT NULL;

COMMENT ON COLUMN workflow_design.codigo_html IS 'Armazena o código-fonte HTML completo gerado para a landing page como backup e auditoria.';
