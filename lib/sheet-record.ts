export type SheetData = Record<string, unknown>;

export type SheetRecord = SheetData & {
    data?: SheetData;
    sourceSheet?: string;
    recordId?: string;
    _id?: unknown;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    toObject?: () => SheetRecord;
};
