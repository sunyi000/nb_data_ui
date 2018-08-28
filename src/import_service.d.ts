declare module 'importservice'{
	export class ImportService
	{
		
		constructor(options:CommonOptions)
	}

	export function api_url(): string;

	export function post(path:string, files: ImportFile[],options:CommonOptions):void;

	export function get():void;

	interface ImportFile{
		url: string,
		name: string
	}

	interface CommonOptions{
		base_url: string,
		notebook_path: string
	}
}

