"use strict";
// DeepKit Fabric - Shared service infrastructure
// "The connective tissue of the Arsenal."
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Events = exports.healthEndpoint = exports.DeepKitEventBus = exports.metricsEndpoint = exports.metricsMiddleware = exports.log = exports.structuredLogger = exports.deepkitAuth = void 0;
var auth_middleware_1 = require("./auth-middleware");
Object.defineProperty(exports, "deepkitAuth", { enumerable: true, get: function () { return auth_middleware_1.deepkitAuth; } });
var logger_1 = require("./logger");
Object.defineProperty(exports, "structuredLogger", { enumerable: true, get: function () { return logger_1.structuredLogger; } });
Object.defineProperty(exports, "log", { enumerable: true, get: function () { return logger_1.log; } });
var metrics_1 = require("./metrics");
Object.defineProperty(exports, "metricsMiddleware", { enumerable: true, get: function () { return metrics_1.metricsMiddleware; } });
Object.defineProperty(exports, "metricsEndpoint", { enumerable: true, get: function () { return metrics_1.metricsEndpoint; } });
var event_bus_1 = require("./event-bus");
Object.defineProperty(exports, "DeepKitEventBus", { enumerable: true, get: function () { return event_bus_1.DeepKitEventBus; } });
var health_1 = require("./health");
Object.defineProperty(exports, "healthEndpoint", { enumerable: true, get: function () { return health_1.healthEndpoint; } });
exports.Events = __importStar(require("./events"));
