# Tardy Tracker Hero

CRIAR APLICATIVO ESCOLAR PONTUAL+



Quero criar um aplicativo web chamado Pontual+, para uma escola brasileira, com previsão de utilização a partir de 2027. O objetivo é digitalizar o registro de atrasos dos alunos, substituir as listas de papel e facilitar o acompanhamento pela equipe escolar e pela coordenação.



IMPORTANTE: Não quero apenas uma imagem ou uma demonstração estática. Quero um aplicativo funcional, com telas navegáveis, botões funcionando, banco de dados e registros que permaneçam salvos. Desenvolva o projeto por etapas e explique quando alguma configuração externa for necessária.



1. Design e identidade visual



Crie uma interface moderna, profissional, bonita e muito fácil de usar, inclusive para pessoas que não entendem de tecnologia.



- Nome: Pontual+.

- Idioma: português brasileiro.

- Cores principais: azul-marinho, azul profundo e branco.

- Vermelho para atrasos sem justificativa.

- Laranja para atrasos com justificativa.

- Verde para indicar situação regular no período selecionado.

- Layout responsivo, funcionando em celulares Android, tablets e computadores.

- Botões grandes, textos legíveis, menus simples e ícones intuitivos.

- Aparência de aplicativo, com navegação inferior no celular.

- Use dados fictícios para demonstrar o funcionamento inicial.



2. Cadastro e organização dos alunos



O sistema deverá permitir cadastrar e organizar alunos desde o 6º ano do ensino fundamental até o 3º ano do ensino médio.



Cada aluno deverá ter:



- Nome completo.

- Identificador interno único.

- Ano escolar e turma.

- Situação ativa ou inativa.

- Histórico individual de atrasos.



Organize os estudantes por ano, turma e período letivo.



Implemente pesquisa por nome, filtros por turma e seleção rápida de estudantes. Evite nomes duplicados e permita corrigir cadastros por usuários autorizados.



Não disponibilize publicamente listas de alunos.



3. Registro de atraso



Crie uma tela chamada "Registrar atraso".



O fluxo deverá ser simples:



1. O funcionário autorizado seleciona a turma.

2. Pesquisa e seleciona o aluno.

3. O sistema preenche automaticamente a data atual e registra o horário.

4. O responsável informa se existe justificativa.

5. Pode acrescentar uma observação curta, se necessário.

6. Confirma o registro.

7. O sistema salva o atraso e atualiza automaticamente o histórico e os contadores do aluno.



Utilize os seguintes indicadores:



- Vermelho: atraso sem justificativa.

- Laranja: atraso com justificativa.

- Verde: nenhum atraso registrado no período selecionado.



A cor deve sempre vir acompanhada de texto, para que o significado seja compreensível para todos.



Não permita registros duplicados acidentais. Caso seja necessário corrigir ou cancelar um registro, exija permissão adequada e mantenha um histórico da alteração.



4. Histórico individual



Cada aluno deverá possuir uma tela de histórico com:



- Nome e turma.

- Bimestre selecionado.

- Quantidade de atrasos no período.

- Quantidade de atrasos justificados e não justificados.

- Lista cronológica de ocorrências.

- Data, horário e situação de cada registro.

- Calendário com os dias em que houve atraso.

- Resumo dos bimestres anteriores.



O aluno poderá consultar somente o próprio histórico depois de entrar em sua conta. Ele não poderá editar, apagar ou justificar ocorrências diretamente sem um procedimento autorizado pela escola.



5. Calendário e períodos letivos



Crie um calendário integrado ao sistema.



O calendário deverá:



- Mostrar as datas dos atrasos.

- Diferenciar as ocorrências justificadas e não justificadas.

- Permitir visualizar cada bimestre separadamente.

- Mostrar o total de ocorrências de cada período.

- Permitir que administradores autorizados configurem o calendário escolar e as datas de início e fim de cada bimestre.



Não presuma que todos os bimestres têm exatamente dois meses ou datas fixas. Os períodos devem seguir o calendário oficial da escola.



Os registros históricos não devem desaparecer quando um bimestre terminar. Ao iniciar um novo período, a contagem do bimestre deve ser reiniciada sem apagar os registros anteriores.



6. Alertas automáticos



Implemente uma regra configurável para gerar um alerta quando o aluno atingir três atrasos no mesmo bimestre.



Quando o terceiro atraso for registrado:



- Exiba um aviso visual claro.

- Mostre o nome do aluno, turma e quantidade de ocorrências.

- Disponibilize os detalhes do histórico para a coordenação.

- Registre a data em que o alerta foi gerado.

- Evite gerar alertas duplicados para a mesma situação.

- Permita acompanhar se o caso foi analisado pela coordenação.



O alerta deve servir para análise humana, não para aplicar punições automaticamente.



A escola deverá poder configurar sua política de contagem, inclusive como tratar atrasos justificados. Não invente regras disciplinares.



7. Perfis e permissões



Crie quatro perfis de acesso:



Administrador



- Gerencia usuários, turmas, alunos e períodos letivos.

- Configura regras do sistema.

- Gerencia permissões e consulta registros de auditoria.



Equipe escolar



- Funcionários autorizados podem registrar atrasos.

- Podem consultar os dados necessários às suas funções.

- Não podem administrar o sistema sem permissão específica.



Coordenação



- Consulta históricos e alertas autorizados.

- Analisa ocorrências.

- Pode registrar encaminhamentos e observações restritas.

- Gera relatórios para acompanhamento.



Aluno



- Consulta somente o próprio histórico e calendário.

- Não pode consultar outros alunos.

- Não pode alterar ocorrências oficiais.



Mais de uma equipe poderá registrar atrasos, cada uma usando sua própria conta. Identifique quem realizou cada operação.



Implemente autenticação real e controle de acesso no servidor e no banco de dados. Não considere suficiente apenas esconder botões na interface.



8. Painel da coordenação



Crie um painel com:



- Total de atrasos no período.

- Total de ocorrências justificadas e não justificadas.

- Alunos que atingiram o limite configurado.

- Alertas pendentes de análise.

- Filtros por bimestre, ano e turma.

- Histórico de encaminhamentos.

- Relatórios para consulta e impressão.



Não exiba dados pessoais além do necessário para cada função.



9. Segurança e privacidade



Este aplicativo poderá lidar com dados de menores de idade. A proteção desses dados é obrigatória.



Implemente:



- Login individual e seguro.

- Banco de dados com regras de acesso por perfil.

- Proteção para impedir que um aluno veja o histórico de outro.

- Proteção das operações administrativas.

- Registro de alterações importantes, identificando usuário, data e operação.

- Coleta somente dos dados necessários.

- Procedimentos de correção de dados e gestão de contas.

- Nenhuma lista pública de alunos.

- Nenhuma exposição de senhas, chaves secretas ou credenciais no código público.

- Nenhum dado real de estudantes nos testes iniciais.



Planeje a solução de acordo com a LGPD e com as orientações da escola. O uso com dados reais somente deverá ocorrer após aprovação da instituição e validação das permissões, da segurança e das responsabilidades pelo tratamento dos dados.



10. Tecnologia e banco de dados



Construa inicialmente um aplicativo web responsivo, que possa ser aberto por um link e utilizado no celular, sem exigir publicação imediata na Play Store.



Utilize uma solução compatível com a plataforma Lovable para autenticação e banco de dados, como Supabase, se apropriado.



Crie uma estrutura organizada para:



- Usuários e perfis.

- Alunos.

- Turmas.

- Períodos letivos.

- Registros de atraso.

- Justificativas.

- Alertas.

- Encaminhamentos da coordenação.

- Histórico de alterações.



Configure regras de acesso no banco de dados. Não utilize somente armazenamento local do navegador como banco de dados oficial.



11. Testes obrigatórios



Antes de considerar o projeto pronto, teste os seguintes cenários:



1. Registrar o primeiro atraso de um aluno.

2. Registrar o segundo atraso em outra data.

3. Registrar o terceiro atraso e verificar o alerta.

4. Confirmar que os registros de bimestres diferentes são contabilizados separadamente.

5. Confirmar que os registros antigos permanecem no histórico.

6. Verificar a distinção entre justificativa e ausência de justificativa.

7. Tentar acessar o histórico de outro aluno com uma conta de aluno e confirmar que o acesso é bloqueado.

8. Confirmar que usuários sem permissão não podem apagar ou modificar ocorrências.

9. Testar o aplicativo em telas de celular.

10. Testar a correção de um registro e verificar o histórico de alterações.



12. Como desenvolver



Sou iniciante e não sei programar. Portanto, preciso que você conduza o desenvolvimento de forma simples, sem presumir que conheço termos técnicos.



Comece criando a estrutura visual e as telas com dados fictícios. Depois, implemente o banco de dados, o login, as permissões e as funcionalidades.



Priorize primeiro o funcionamento correto e a segurança, depois os detalhes visuais.



Se alguma integração exigir configuração ou pagamento, explique isso claramente antes de prosseguir.



Comece agora pela primeira versão funcional do Pontual+, com uma tela inicial, seleção de turma, pesquisa de alunos, registro de atrasos, histórico individual e painel de alertas.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://tardy-tracker-hero.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cba25713-b144-55b2-9e66-338f98c91a30).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
