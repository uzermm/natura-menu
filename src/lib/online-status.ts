export type RestaurantHours={dayOfWeek:string;openingTime:string;closingTime:string};
export type RestaurantInfo={closure?:{until:number|null;state:string;error:string}|null;workingStatus:string;workingHours:RestaurantHours[];checkedAt:number|null;error:string};
export type BranchConnection={id:string;name:string;state:string;lastSuccess:number|null;message?:string;restaurant?:RestaurantInfo};
export type OnlineStatus={printing:string;refreshing?:boolean;canRefresh?:boolean;accounts:string;branches:BranchConnection[]};
