export interface StreamEvent {
    type: 'status' | 'state' | 'token' | 'complete' | 'error';
    data: Record<string, unknown>;
}
interface StartOptions {
    topic: string;
    maxIterations?: number;
    confidenceThreshold?: number;
    maxResultsPerSearch?: number;
}
export declare function useResearchDigestStream(): {
    events: StreamEvent[];
    digestText: string;
    isRunning: boolean;
    error: string | null;
    latestState: Record<string, unknown> | null;
    start: ({ topic, maxIterations, confidenceThreshold, maxResultsPerSearch, }: StartOptions) => void;
    stop: () => void;
    reset: () => void;
};
export {};
//# sourceMappingURL=useResearchDigestStream.d.ts.map