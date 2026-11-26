export {};

declare global {
  interface Window {
    skywatchAgent?: {
      openAttachment?: (request: {
        attachmentId: number;
        filename: string;
        viewUrl: string;
        downloadUrl: string;
      }) => Promise<boolean | void | { opened?: boolean }> | boolean | void | { opened?: boolean };
      ensureAttachment?: (request: {
        attachmentId: number;
        filename: string;
        viewUrl: string;
        downloadUrl: string;
      }) => Promise<boolean | void | { opened?: boolean }> | boolean | void | { opened?: boolean };
    };
  }
}
