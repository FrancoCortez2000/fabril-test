import { referenceTime } from "@/features/dashboard/reference-time";

const AS_OF = "2026-11-20";
const END_OF_AS_OF = new Date("2026-11-20T23:59:59-03:00");

test("fuera de la demo es la hora real", () => {
  const real = new Date("2026-11-27T10:00:00-03:00");
  expect(referenceTime({ isDemo: false, asOf: AS_OF, activity: [], realNow: real })).toEqual(real);
});

test("en la demo es el final del día de referencia si no hay actividad posterior", () => {
  expect(
    referenceTime({
      isDemo: true,
      asOf: AS_OF,
      activity: [{ at: "2026-11-20T10:00:00-03:00" }],
      realNow: new Date("2026-11-27T10:00:00-03:00"),
    }),
  ).toEqual(END_OF_AS_OF);
});

test("en la demo, si hay actividad posterior, la referencia es la actividad más nueva", () => {
  expect(
    referenceTime({
      isDemo: true,
      asOf: AS_OF,
      activity: [{ at: "2026-11-21T08:00:00-03:00" }, { at: "2026-11-23T09:30:00-03:00" }],
      realNow: new Date("2026-11-27T10:00:00-03:00"),
    }),
  ).toEqual(new Date("2026-11-23T09:30:00-03:00"));
});
