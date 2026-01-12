import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";
import * as v from "valibot";

type Day = { year: number; month: number; day: number };
type Minutes = number & { _tag?: "MinutesUnit" };

const filePath = path.join(import.meta.dirname, "Pontofile");
const lines = fs
  .readFileSync(filePath, { encoding: "utf-8" })
  .split(/\r?\n|\r|\n/g)
  .map((line) => line.trim());

const removeAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const readDate = (s: string): Day => {
  const [year, month, day] = s.split("-").map((s) => parseInt(s));
  return { year, month, day };
};

const readHhMm = (s: string): Minutes => {
  const isNegative = s.charAt(0) === "-";
  if (isNegative) s = s.slice(1);
  const [strHours, strMinutes] = s.split(":");
  const total: Minutes = parseInt(strHours) * 60 + parseInt(strMinutes);

  return isNegative ? -total : total;
};

const printDay = ({ day, month, year }: Day) =>
  `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;

const printMinutes = (s: Minutes) => {
  const h = Math.floor(Math.abs(s) / 60);
  const m = Math.abs(s) % 60;
  return s < 0
    ? `-${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
    : `+${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

const SchemaTime = v.message(
  v.pipe(v.string(), v.regex(/^\-?\d+:\d+$/), v.transform(readHhMm)),
  "Unable to parse time (HH:MM, may be negative)."
);

const SchemaDate = v.message(
  v.pipe(v.string(), v.regex(/^\d\d\d\d-\d\d-\d\d$/), v.transform(readDate)),
  "Unable to parse date (YYYY-MM-DD)."
);

const WORKDAY = (8 * 60) as Minutes; // 8hrs/day
const LUNCH = 60 as Minutes;

let state = {
  operatingDay: null as Day | null,
  operatingDayFirstClockIn: null as Minutes | null,
  operatingDayTimeInOffice: 0 as Minutes,
  minutesBank: 0 as Minutes,

  accumulatorTimeInOffice: 0 as Minutes,
  accumulatorDaysOff: 0,
};

const commitCurrentDay = () => {
  if (!state.operatingDay) return;

  // dia completo
  let bankDelta: Minutes = 0;
  if (Math.abs(WORKDAY + LUNCH - state.operatingDayTimeInOffice) > 10) {
    bankDelta = state.operatingDayTimeInOffice - (WORKDAY + LUNCH);
  }

  state.minutesBank += bankDelta;
  state.accumulatorTimeInOffice += state.operatingDayTimeInOffice;

  if (state.operatingDayFirstClockIn !== null) {
    const clockIn = state.operatingDayFirstClockIn;
    const fakedClockOut = clockIn + state.operatingDayTimeInOffice;

    // prettier-ignore
    console.log(`   ${chalk.underline("Ponto Final")}  |  ${printMinutes(clockIn).replace('+','')} -> ${printMinutes(fakedClockOut).replace('+','')} (T ${printMinutes(state.operatingDayTimeInOffice).replace("+", "")})  |  ${bankDelta ? `BhΔ ${printMinutes(bankDelta)}  ` : "            "}Bh Tot. ${printMinutes(state.minutesBank)}`);
  } else {
    // prettier-ignore
    console.log(`   ${chalk.underline("Ponto Final")}  |  ------------------------  |  ${bankDelta ? `BhΔ ${printMinutes(bankDelta)}` : ""}  Bh Tot. ${printMinutes(state.minutesBank)}`);
  }

  console.log();
};

console.log();
console.log("Pontofile");
console.log("(c) 2026 Lucas Bortoli");
console.log();

for (const line of lines) {
  if (line.trimStart().startsWith("#")) continue; // comentário
  if (line.trim().length === 0) continue; // linha vazia

  const [command, ...args] = line.split(" ").filter((s) => s.length);

  switch (removeAccents(command.toUpperCase())) {
    case "BANCO": {
      const [time] = v.parse(v.tuple([SchemaTime]), args);
      state.minutesBank = time;
      break;
    }
    case "DATA": {
      commitCurrentDay();

      const [date] = v.parse(v.tuple([SchemaDate]), args);
      state.operatingDay = date;
      state.operatingDayFirstClockIn = null;
      state.operatingDayTimeInOffice = 0;

      // prettier-ignore
      console.log(`Dia ${printDay(state.operatingDay)}  |  ------------------------  |  `);

      break;
    }
    case "PONTO": {
      if (state.operatingDay === null) {
        throw new Error("Operação PONTO requer um dia operante (use DATA)");
      }

      const [clockIn, clockOut] = v.parse(v.tuple([SchemaTime, SchemaTime]), args);

      const timeInOffice = clockOut - clockIn;
      state.operatingDayTimeInOffice += timeInOffice;
      if (state.operatingDayFirstClockIn === null) {
        state.operatingDayFirstClockIn = clockIn;
      }

      // prettier-ignore
      console.log(`         Ponto  |  ${printMinutes(clockIn).replace('+','')} -> ${printMinutes(clockOut).replace('+','')} (T ${printMinutes(timeInOffice).replace("+", "")})  |  `);

      break;
    }
    case "ESTIMATE": {
      if (state.operatingDay === null) {
        throw new Error("Operação ESTIMATE requer um dia operante (use DATA)");
      }

      const [clockIn] = v.parse(v.tuple([SchemaTime]), args);
      const remainingTime = Math.max(WORKDAY + LUNCH - state.operatingDayTimeInOffice, 0);
      const expectedClockout = clockIn + remainingTime;

      // prettier-ignore
      const endMarkerStr = `${chalk.italic.grey(`${printMinutes(expectedClockout).replace('+','')} (T ${printMinutes(remainingTime).replace('+', '')})`)}`
      // prettier-ignore
      console.log(`    Estimativa  |  ${printMinutes(clockIn).replace('+','')} -> ${endMarkerStr}  |  `);

      state.operatingDayFirstClockIn = clockIn;
      state.operatingDayTimeInOffice += WORKDAY + LUNCH;
      state.accumulatorTimeInOffice += WORKDAY + LUNCH;

      break;
    }
    case "DAYOFF": {
      if (state.operatingDay === null) {
        throw new Error("Operação DAYOFF requer um dia operante (use DATA)");
      }

      state.accumulatorDaysOff++;

      // prettier-ignore
      console.log(`                |  Dia off                   |  `);

      break;
    }
    case "BANCOZERO": {
      if (state.operatingDay === null) {
        // prettier-ignore
        throw new Error("Operação BANCOZERO requer um dia operante (use DATA)");
      }

      if (state.minutesBank !== 0) {
        // prettier-ignore
        console.log(`Dia ${printDay(state.operatingDay)}  |  ----- Zerar Banco! -----  |  Bh Tot. ${chalk.red(printMinutes(state.minutesBank))}`);
      } else {
        // prettier-ignore
        console.log(`Dia ${printDay(state.operatingDay)}  |  ----- Zerar Banco! -----  |  Bh Tot. ${chalk.green(printMinutes(state.minutesBank))}`);
      }
      break;
    }
    default:
      throw new Error(`Comando desconhecido: ${command}`);
  }
}

commitCurrentDay();

console.log();
// prettier-ignore
console.log(`Tempo total no escritório :  ${printMinutes(state.accumulatorTimeInOffice).replace("+", "")}`);
// prettier-ignore
console.log(`Banco de Horas .......... : ${printMinutes(state.minutesBank)}`);
// prettier-ignore
console.log(`Dias off ................ :  ${state.accumulatorDaysOff.toString().padStart(5, " ")}`);
console.log();
