**Pontofile** é uma ferramenta de linha de comando para gerenciar e rastrear horas de trabalho. Ele permite que você marque pontos, registre dias de folga, e mantenha um banco de horas. Perfeito para quem precisa de uma solução simples e eficaz para gerenciar seu tempo no trabalho.

## Exemplo de Pontofile

```powershell
# Inicializa o banco de horas com um saldo
BANCO       -09:52

# Diretiva "PONTO": Marcação de ponto.
DATA         2026-01-05
PONTO        07:21 16:10

# Diretiva "DAYOFF": debita 8hrs do banco de horas
DATA         2026-01-06
DAYOFF

# Diretiva "PONTO" sem hora de término: irá printar o horário esperado de saída
DATA         2026-01-07
PONTO        08:30
```

## Funcionalidades

- **Marcação de Ponto**: Registe suas horas de entrada e saída.
- **Dias de Folga**: Adicione dias de folga ao seu registro.
- **Banco de Horas**: Mantenha um saldo de horas excedentes ou faltantes.
- **Validação de Dados**: Garante que os dados inseridos sejam válidos e corretos.
- **Relatórios Visuais**: Saídas coloridas para fácil visualização de informações importantes.

## Comandos Disponíveis

- **BANCO**: Inicializa o banco de horas com um saldo específico.
- **DATA**: Define a data operante para as próximas entradas.
- **PONTO**: Marca a entrada e saída do trabalho. Pode ser usado sem a hora de saída para calcular a hora de saída esperada.
- **DAYOFF**: Adiciona um dia de folga, debitando 8 horas do banco de horas.
- **BANCOZERO**: Zera o banco de horas.

## Execução

Execute o script com:

```bash
npm install
node pontofile.ts
```
