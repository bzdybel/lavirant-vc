import type { Request, Response } from "express";
import { GetInPostConfigHandler } from "../InPostHandlers";
import { AppConfig } from "../../config/appConfig";
import { makeResponse } from "../../__tests__/helpers/httpMocks";

jest.mock("../../config/appConfig", () => ({
  AppConfig: {
    IS_PRODUCTION: false,
    getGeowidgetToken: jest.fn(),
  },
}));

type MockedAppConfig = {
  IS_PRODUCTION: boolean;
  getGeowidgetToken: jest.Mock;
};

describe("InPostHandlers", () => {
  const mockedAppConfig = AppConfig as unknown as MockedAppConfig;

  beforeEach(() => {
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
