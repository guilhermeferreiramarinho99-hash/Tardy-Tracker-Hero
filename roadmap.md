# Login próprio, cadastro de escolas e relatórios

## Pedido atual
- [x] Excluir alunos pela lista Alunos e pela Administração, com confirmação e proteção do histórico existente.
- [x] Retirar qualquer opção visível de cadastrar escola, inclusive na entrada; endereço antigo redireciona para o login, conferido no celular.
- [x] Senha adicional da escola antes do login, troca pela administração e testes; contas individuais preservadas, fluxo offline existente mantido. Entrada correta/incorreta, persistência e formulário da administração conferidos; rotação e permissões testadas em banco descartável.
- [x] Adaptar a entrada para a Escola Estadual Menodora Fialho de Figueiredo e bloquear novos cadastros de escolas; dados e vínculos existentes preservados. Testes de permissões aprovados e entrada conferida no celular e computador.
- [x] Retirar confirmação por e-mail do cadastro e melhorar a entrada com senha; preservar aprovação e convites da escola. Configuração aplicada; testes do cadastro aprovados; página inicial conferida com sessão autenticada no celular.
- [ ] Opção de excluir usuários — aguardando esclarecer o “Não” enviado pelo usuário.
- [ ] Baixar backup de alunos, turmas e atrasos, com códigos escolares como texto (ex.: 002) — aguardando esclarecer o “Não”.

- [ ] Logo na tela inicial e nas telas de entrada.
- [ ] Banco: campos da escola (e-mail, endereço, cidade, estado, CEP, telefone), status "Aguardando verificação", nome de usuário por perfil, papel "superadmin".
- [ ] Cadastro público de escola (com dados do responsável) sem liberar acesso; duplicidade por nome normalizado + cidade/estado.
- [ ] Área secreta de verificação: aprovar/recusar escolas pendentes (aprovada → responsável vira administrador).
- [ ] Login: usuário OU e-mail; sem Google, sem cadastro público; mensagem de não autorizado; recuperação de senha mantida.
- [ ] Convites: código aleatório, temporário, uso único, com perfil já escolhido; resgate com criação de senha própria.
- [ ] Admin: gerar/revogar convites, definir nome de usuário, ver lista de autorizados.
- [ ] Relatórios: planilha por bimestre e turma (6º ano EF a 3ª série EM), cores verde/amarelo/vermelho, pendentes em laranja, cabeçalho completo, exportar Excel (.xlsx) e PDF.
- [ ] Testes: cadastro de escola, verificação, convite, login por usuário e e-mail, isolamento entre escolas, relatórios e exportações.
- [ ] Preservar: registro de atrasos (inclusive offline), alunos, turmas, bimestres, alertas e auditoria.
