import {Migration} from "./Migration";
import {Status} from "./Status";

export interface State {
    migration: Migration;
    status: Status;
}