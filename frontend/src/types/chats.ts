export interface Message {
  id:string;
  from:string;
  to?:string;
  message:string;
  timestamp:number;
}