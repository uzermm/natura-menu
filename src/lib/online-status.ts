export type BranchConnection={id:string;name:string;state:string;lastSuccess:number|null};
export type OnlineStatus={printing:string;accounts:string;branches:BranchConnection[]};
