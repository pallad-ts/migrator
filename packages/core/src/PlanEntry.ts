import {Migration} from "./Migration";
import {Migrator} from "./Migrator";

export interface PlanEntry {
    migration: Migration;
    direction: Migrator.Direction;
}
