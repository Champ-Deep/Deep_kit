import { PortSuggestionRequest, PortSuggestionResponse, PortEntry } from '../types';
/**
 * Smart port suggestion engine
 */
export declare function suggestPort(request: PortSuggestionRequest, currentPorts: PortEntry[]): Promise<PortSuggestionResponse>;
/**
 * Analyze a specific port
 */
export declare function analyzePort(port: number, currentPorts: PortEntry[]): {
    available: boolean;
    details?: PortEntry;
    zone: string;
    recommendation: string;
};
//# sourceMappingURL=suggestion-engine.d.ts.map