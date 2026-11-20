export type BranchConnection={id:string;name:string;state:string;lastSuccess:number|null;message?:string};
export type OnlineStatus={printing:string;refreshing?:boolean;canRefresh?:boolean;accounts:string;branches:BranchConnection[]};
