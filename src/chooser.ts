declare var Dropbox: Dropbox;

interface Dropbox {
    choose(options: DropboxChooseOptions): void;
}

interface DropboxChooseOptions {
    success(files: DropboxFile[]): void;
    cancel?(): void;
    linkType: "direct";
    multiselect: boolean;
    extensions?: string[];
}


interface DropboxFile {
    name: string;
    link: string;
    bytes: number;
    icon: string;
    thumbnailLink?: string;
    isDir: boolean;
}

