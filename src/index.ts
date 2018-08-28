import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import '../style/index.css';

import {
  ICommandPalette
} from '@jupyterlab/apputils';

import {
   Menu
} from '@phosphor/widgets';

import {
	IMainMenu
} from '@jupyterlab/mainmenu';

import{
	IFileBrowserFactory
} from '@jupyterlab/filebrowser'


////<reference path="./import_service.d.ts" />
//import * as importservice from 'importservice';




//declare var require:any;

//import { ServiceManager } from '@jupyterlab/services';

//import * as fs from "fs";

// import * as dropbox from 'dropbox';
// //import dp=require()
// const dbx=new dropbox.Dropbox({accessToken:'PioO_nCySC4AAAAAAAAK8Yh1qHnczV6Dfkx6L7Pcbbb_qZzPsMMHODb5XG9P3sNV'});


//var ACCESS_TOKEN="PioO_nCySC4AAAAAAAAK8Yh1qHnczV6Dfkx6L7Pcbbb_qZzPsMMHODb5XG9P3sNV";

var script = document.createElement('script');
script.type = 'text/javascript';
script.src='https://www.dropbox.com/static/api/2/dropins.js';
script.id="dropboxjs";
script.setAttribute("data-app-key","xnthqk084hoxoc0");
document.head.appendChild(script);

export 
namespace CommandIDs {
	export
	const saver: string = 'dropbox-saver';

	export
	const chooser: string= 'dropbox-chooser';

};


/**
 * Initialization data for the nb_data_ui extension.
 */

const extension: JupyterLabPlugin<void> = {
  id: 'nb_data_ui',
  autoStart: true,
  requires: [ICommandPalette, IMainMenu, IFileBrowserFactory],
  activate: activeHubExtension
};

function activeHubExtension(app: JupyterLab, palette: ICommandPalette, mainMenu: IMainMenu, browserFactory: IFileBrowserFactory):void {
	const { commands } =app;

	//console.log(mainMenu.fileMenu);
	console.log(browserFactory.tracker.currentWidget.model.path);
	//console.log(app.shell.children);
	commands.addCommand(CommandIDs.saver,{
		label: 'Saver',
		caption: 'Saver',
		execute:()=>{
			
			     // var saver_options: DropboxSaveOptions={

			     // 	files: [{url:"/tmp/test.txt"}],
        //             success: function() {
        //                 console.log("file saved");
        //             },
        //             cancel: function() {
                        
        //             },
        //             progress: function(progress){

        //             },
        //             error: function(errorMessage) {

        //             }

        //        }
        
        //        Dropbox.save(saver_options);
		}
	});

	commands.addCommand(CommandIDs.chooser,{
		label: 'Chooser',
		caption: 'Chooser',
		execute: () =>{
				var options: DropboxChooseOptions={
				    success: function(files) {
				      for (const file of files) {
				      	console.log(file.link);
 					
				        downloadFile(file,browserFactory);
				        
				      }
				    },
				    cancel: function() {
				      //optional
				    },
			    linkType: "direct", 
			    multiselect: true, 			   
			};

			Dropbox.choose(options);

			// list files
			  // var dbx=new dropbox.Dropbox({accessToken:ACCESS_TOKEN})
			  // dbx.filesListFolder({path: ''})
    	// 		.then(function(response) {
     //  			displayFiles(response.entries);
     //  			console.log(response);
    	// 		})
    	// 		.catch(function(error: DropboxTypes.Error<DropboxTypes.files.ListFolderError>) {
     //  				console.error(error);
    	// 		});

		}


		

	});

	let menu= new Menu({commands});
	menu.title.label='Dropbox';
	[
		CommandIDs.saver,
		CommandIDs.chooser,
	].forEach(command=>{
		menu.addItem({command});

	});

	mainMenu.addMenu(menu,{rank:2000});
    
    addUploadContextMenu();

    
}

function addUploadContextMenu():void {
	console.log("testtest");

}

// function displayFiles(files: DropboxTypes.files.MetadataReference[]) {
//   //var filesList = document.getElementById('files');
//   //var li: HTMLLIElement;
//   for (var i = 0; i < files.length; i++) {
//   	console.log(files[i].name);
//     //li = document.createElement('li');
//     //li.appendChild(document.createTextNode(files[i].name));
//     //filesList.appendChild(li);
//   }
// }

 function downloadFile(file: DropboxFile,bf: IFileBrowserFactory):void{

    // var common_options: importservice.CommonOptions = {
    //     base_url: "localhost:8889/lab",
    //     notebook_path: "/home/yisun"
    // }

 	//var is=new importservice.ImportService(common_options);

 	//console.log(is);

	//console.log(bf.tracker.currentWidget.model.path);

	// const prom=bf.tracker.currentWidget.model.cd();
	// prom.then( (res)=>{
	// 	console.log(res);

	// });
 //    var args={path:'/test/startidea'};
	// dbx.sharingCreateSharedLinkWithSettings(args)
	// .then((response)=>{
	// 		console.log(response.url);
	// 		console.log(response);
 //            console.log("Dropbox download path: "+ "./testdropbox");
           

	// })
	// .catch((error)=>
	// {
	// 	//console.log(error.error.error_summary.startsWith("shared_link_already_exists"));
	// 	if(error.error.error_summary.startsWith("shared_link_already_exists"))	
	// 	{
	// 		dbx.sharingListSharedLinks(args)
 //  		    .then(
	// 	    	   function(response) 
	// 				{
	// 				   console.log("old share url="+response.links[0].url)
 //                       // download file
                       
 //                       console.log(fs);
	// 				}
	// 		 )

	// 	}else
	// 	{	
 // 		    console.log("Dropbox download "+error);
		    
	// 	}
	// });

	// dbx.filesDownload({path:'/test/startidea'})
	// .then((response)=>{
	// 	var downloadUrl=URL.createObjectURL(response.fileBlob);

	// }).catch((error)=>{

	// })


}
//function openchooser(file: any): void {
  // var li  = document.createElement('li');
  // var a   = document.createElement('a');
  // a.href = file.link;
  // var img = new Image();
  // var src = file.thumbnailLink;
  // src = src.replace("bounding_box=75", "bounding_box=256");
  // src = src.replace("mode=fit", "mode=crop");
  // img.src = src;
  // img.className = "th"
  // document.getElementById("img_list").appendChild(li).appendChild(a).appendChild(img);
//}

export default extension;