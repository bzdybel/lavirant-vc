import type { Request, Response } from "express";
import { GetInPostConfigHandler } from "../InPostHandlers";
import { AppConfig } from "../../config/appConfig";

jest.mock("../../config/appConfig", () => ({
  AppConfig: {
    IS_PRODUCTION: false,
    getGeowidgetToken: jest.fn(),
  },
}));

type MockedAppConfig = typeof AppConfig & {
  IS_PRODUCTION: boolean;
  getGeowidgetToken: jest.Mock;
};

function makeResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("InPostHandlers", () => {
  const mockedAppConfig = AppConfig as MockedAppConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAppConfig.IS_PRODUCTION = false;
    mockedAppConfig.getGeowidgetToken.mockReturnValue("");
  });

  describe("GetInPostConfigHandler", () => {
    it("returns config with enabled=true when geowidget token exists", () => {
      mockedAppConfig.getGeowidgetToken.mockReturnValue("test_token_123");

      const handler = GetInPostConfigHandler();
      const req = {} as Request;
      const res = makeResponse();

      handler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        enabled: true,
        geowidgetToken: "test_token_123",
        environment: "sandbox",
      });
    });

    it("returns config with enabled=false when geowidget token is missing", () => {
      mockedAppConfig.getGeowidgetToken.mockReturnValue("");

      const handler = GetInPostConfigHandler();
      const req = {} as Request;
      const res = makeResponse();

      handler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        enabled: false,
        geowidgetToken: null,
        environment: "sandbox",
      });
    });

    it("returns production environment when IS_PRODUCTION=true", () => {
      mockedAppConfig.IS_PRODUCTION = true;
      mockedAppConfig.getGeowidgetToken.mockReturnValue("prod_token");

      const handler = GetInPostConfigHandler();
      const req = {} as Request;
      const res = makeResponse();

      handler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        enabled: true,
        geowidgetToken: "prod_token",
        environment: "production",
      });
    });

    it("returns sandbox environment when IS_PRODUCTION=false", () => {
      mockedAppConfig.IS_PRODUCTION = false;
      mockedAppConfig.getGeowidgetToken.mockReturnValue("sandbox_token");

      const handler = GetInPostConfigHandler();
      const req = {} as Request;
      const res = makeResponse();

      handler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        enabled: true,
        geowidgetToken: "sandbox_token",
        environment: "sandbox",
      });
    });

    it("returns geowidget token when available", () => {
      mockedAppConfig.getGeowidgetToken.mockReturnValue("my_geowidget_token");

      const handler = GetInPostConfigHandler();
      const req = {} as Request;
      const res = makeResponse();

      handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          geowidgetToken: "my_geowidget_token",
        })
      );
    });

    it("returns null token when not available", () => {
      mockedAppConfig.getGeowidgetToken.mockReturnValue("");

      const handler = GetInPostConfigHandler();
      const req = {} as Request;
      const res = makeResponse();

      handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          geowidgetToken: null,
        })
      );
    });

    it("returns null token when undefined", () => {
      mockedAppConfig.getGeowidgetToken.mockReturnValue(undefined);

      const handler = GetInPostConfigHandler();
      const req = {} as Request;
      const res = makeResponse();

      handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
          geowidgetToken: null,
        })
      );
    });

    it("returns enabled=false for null token", () => {
      mockedAppConfig.getGeowidgetToken.mockReturnValue(null);

      const handler = GetInPostConfigHandler();
      const req = {} as Request;
      const res = makeResponse();

      handler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        enabled: false,
        geowidgetToken: null,
        environment: "sandbox",
      });
    });

    it("returns all three config fields", () => {
      mockedAppConfig.getGeowidgetToken.mockReturnValue("token_abc");

      const handler = GetInPostConfigHandler();
      const req = {} as Request;
      const res = makeResponse();

      handler(req, res);

      const response = (res.json as jest.Mock).mock.calls[0][0];

      expect(response).toHaveProperty("enabled");
      expect(response).toHaveProperty("geowidgetToken");
      expect(response).toHaveProperty("environment");
    });

    it("does not call res.status", () => {
      mockedAppConfig.getGeowidgetToken.mockReturnValue("token");

      const handler = GetInPostConfigHandler();
      const req = {} as Request;
      const res = makeResponse();

      handler(req, res);

      expect(res.status).not.toHaveBeenCalled();
    });

    it("handles whitespace-only token as disabled", () => {
      mockedAppConfig.getGeowidgetToken.mockReturnValue("   ");

      const handler = GetInPostConfigHandler();
      const req = {} as Request;
      const res = makeResponse();

      handler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        enabled: true,
        geowidgetToken: "   ",
        environment: "sandbox",
      });
    });
  });
});
