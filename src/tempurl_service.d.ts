declare module 'tempurlservice'{
	export class TempUrlService
	{
		
		constructor(options:CommonOptions)
	}


	export function post(path:string, files: ImportFile[],options:CommonOptions):void;


	interface ImportFile{
		url: string,
		name: string
	}
	interface CommonOptions{
		base_url: string,
		notebook_path: string
	}
}
