import { describe, expect, it } from "vitest";
import { withJsonErrors } from "./with-json-errors";

describe("withJsonErrors (점검 M8)", () => {
  it("처리 못 한 예외도 한국어 JSON 500으로 돌려준다", async () => {
    const handler = withJsonErrors(async () => {
      throw new Error("boom");
    });
    const res = await handler();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "잠시 문제가 생겼어요. 잠시 후 다시 시도해주세요." });
  });

  it("정상 응답은 그대로 통과시킨다", async () => {
    const handler = withJsonErrors(async (n: number) => Response.json({ n }, { status: 201 }));
    const res = await handler(3);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ n: 3 });
  });
});
