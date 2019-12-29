import {Migration} from "./Migration";

export type Loader = () => Promise<Migration[]> | Migration[];