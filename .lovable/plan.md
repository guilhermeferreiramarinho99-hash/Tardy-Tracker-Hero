# Isolamento de dados por escola

## Objetivo
Garantir no banco que cada conta só consulte ou altere alunos, ocorrências, alertas, configurações e demais dados da escola à qual pertence.

## Implementação
- Revisar as regras de acesso e as funções usadas para registrar, corrigir, cancelar e consultar dados.
- Corrigir qualquer caminho que aceite identificadores de outra escola ou permita trocar a escola de um registro.
- Manter gravações oficiais passando pelas funções autorizadas, com perfis verificados e auditoria.
- Aplicar as correções sem apagar alunos, históricos ou configurações existentes.

## Testes
- Usar duas escolas e contas distintas com dados fictícios.
- Confirmar que cada conta lê apenas os alunos, ocorrências e configurações da própria escola.
- Tentar consultar e alterar registros da outra escola por identificador e confirmar o bloqueio.
- Confirmar que as operações permitidas continuam funcionando dentro da escola correta.
- Executar a verificação de segurança e validar o aplicativo após as mudanças.
