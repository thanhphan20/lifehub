import logger from "./logger";

describe("Logger", () => {
  it("should be defined", () => {
    expect(logger).toBeDefined();
  });

  it("should have expected log methods", () => {
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  it("should have lifehub-workers as default service meta", () => {
    expect(logger.defaultMeta).toEqual({ service: "lifehub-workers" });
  });
});
