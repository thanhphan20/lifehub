import { EventDomain, EventType, LifeHubEvent } from "./types";

describe("Types", () => {
  it("should have correct EventDomain values", () => {
    expect(EventDomain.NUTRITION).toBe("nutrition");
    expect(EventDomain.WORKOUT).toBe("workout");
    expect(EventDomain.ANALYTICS).toBe("analytics");
    expect(EventDomain.NOTION).toBe("notion");
  });

  it("should have correct EventType values", () => {
    expect(EventType.RAW_INGEST).toBe("raw.ingest");
    expect(EventType.ENRICHED_LOGGED).toBe("enriched.logged");
    expect(EventType.SYNC_COMPLETED).toBe("sync_completed");
    expect(EventType.SYNC_FAILED).toBe("sync_failed");
  });

  it("should allow constructing a valid LifeHubEvent", () => {
    const event: LifeHubEvent = {
      version: 1,
      msgId: "msg-001",
      correlationId: "corr-001",
      timestamp: new Date().toISOString(),
      domain: EventDomain.WORKOUT,
      type: EventType.RAW_INGEST,
      data: { sets: 3, reps: 10 },
    };

    expect(event.version).toBe(1);
    expect(event.domain).toBe("workout");
    expect(event.type).toBe("raw.ingest");
    expect(event.data).toEqual({ sets: 3, reps: 10 });
  });
});
