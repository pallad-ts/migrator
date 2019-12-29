import {Migration} from "./Migration";
import {Direction} from "./types";

export interface PlanEntry {
    migration: Migration;
    direction: Direction;
}
