import { Directive, EventEmitter, ElementRef, Input, Output } from '@angular/core';
import { createInvisibleFileInputWrap, isFileInput, detectSwipe } from "./doc-event-help.functions"
import { FileUploader } from './FileUploader.class';

@Directive({selector: '[ngf]'})
export class ngf {
  fileElm:any

  @Input() accept:string
  @Input() maxSize:number
  @Input() forceFilename:string

  @Input() fileDropDisabled=false
  @Input() selectable = false
  @Input('ngf') ref:ngf
  @Output('ngfChange') refChange:EventEmitter<ngf> = new EventEmitter()
  @Input() uploader:FileUploader = new FileUploader({});

  @Input() lastInvalids:{file:File,type:string}[] = []
  @Output() lastInvalidsChange:EventEmitter<{file:File,type:string}[]> = new EventEmitter()

  @Input() fileUrl:string//last file uploaded url
  @Output() fileUrlChange:EventEmitter<string> = new EventEmitter()
  
  @Input() file:File//last file uploaded
  @Output() fileChange:EventEmitter<File> = new EventEmitter()

  @Input() files:File[]
  @Output() filesChange:EventEmitter<File[]> = new EventEmitter<File[]>();

  constructor(public element:ElementRef){}

  ngOnInit(){
    if( this.selectable ){
      this.enableSelecting()
    }

    if( this.accept ){
      this.uploader.options.accept = this.accept
      this.paramFileElm().setAttribute('accept', this.accept)
    }

    if( this.maxSize ){
      this.uploader.options.maxFileSize = this.maxSize
    }

    if( this.forceFilename ){
      this.uploader.options.forceFilename = this.forceFilename
    }

    //create reference to this class with one cycle delay to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(()=>this.refChange.emit(this), 0)
  }

  paramFileElm(){
    if( this.fileElm )return this.fileElm//already defined
    
    //elm is a file input
    const isFile = isFileInput( this.element.nativeElement )
    if(isFile)return this.fileElm = this.element.nativeElement
    
    //create foo file input
    const label = createInvisibleFileInputWrap()
    this.fileElm = label.getElementsByTagName('input')[0]
    this.fileElm.addEventListener('change', this.changeFn.bind(this));
    this.element.nativeElement.appendChild( label )
    return this.fileElm
  }

  enableSelecting(){
    let elm = this.element.nativeElement
    const bindedHandler = this.clickHandler.bind(this)
    elm.addEventListener('click', bindedHandler)
    elm.addEventListener('touchstart', bindedHandler)
    elm.addEventListener('touchend', bindedHandler)
  }

  getOptions():any {
    return this.uploader.options;
  }

  getFilters():any {
    return {};
  }

  handleFiles(files:File[]){
    const valids = this.uploader.getValidFiles(files)
    
    if(files.length!=valids.length){
      this.lastInvalids = this.uploader.getInvalidFiles(files)
      this.lastInvalidsChange.emit(this.lastInvalids)
    }else{
      this.lastInvalids = null
    }

    if( valids.length ){
      this.uploader.addToQueue(valids);
      this.filesChange.emit( this.files=valids );
      
      if(valids.length){
        this.fileChange.emit( this.file=valids[0] )

        if(this.fileUrlChange.observers.length){
          this.uploader.dataUrl( valids[0] )
          .then( (url:any)=>this.fileUrlChange.emit(url) )
        }
      }
    }

    if (this.isEmptyAfterSelection()) {
      this.element.nativeElement.value = '';
    }
  }

  changeFn(event:any) {
    var fileList = event.__files_ || (event.target && event.target.files), files = [];

    if (!fileList) return;

    this.stopEvent(event);
    this.handleFiles(fileList)
  }

  clickHandler(evt:any){
    const elm = this.element.nativeElement
    if (elm.getAttribute('disabled') || this.fileDropDisabled) return false;
    
    var r = detectSwipe(evt);
    // prevent the click if it is a swipe
    if (r != null) return r;

    this.fileElm.click();

    return false;
  }

  isEmptyAfterSelection():boolean {
    return !!this.element.nativeElement.attributes.multiple;
  }

  eventToTransfer(event:any):any {
    return event.dataTransfer ? event.dataTransfer : event.originalEvent.dataTransfer;
  }

  stopEvent(event:any):any {
    event.preventDefault();
    event.stopPropagation();
  }

  transferHasFiles(transfer:any):any {
    if (!transfer.types) {
      return false;
    }

    if (transfer.types.indexOf) {
      return transfer.types.indexOf('Files') !== -1;
    } else if (transfer.types.contains) {
      return transfer.types.contains('Files');
    } else {
      return false;
    }
  }

  eventToFiles(event:Event){
    let transfer = this.eventToTransfer(event);
    if(transfer.files && transfer.files.length)return transfer.files
    if(transfer.items && transfer.items.length)return transfer.items
    return []
  }
}