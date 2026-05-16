type SourcePayload = {
    type: 'file';
    file: File;
} | {
    type: 'url';
    url: string;
};
interface CsvOrSheetSourceInputProps {
    isSubmitting: boolean;
    onSubmit: (payload: SourcePayload) => Promise<void> | void;
}
export declare function CsvOrSheetSourceInput({ isSubmitting, onSubmit }: CsvOrSheetSourceInputProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=CsvOrSheetSourceInput.d.ts.map