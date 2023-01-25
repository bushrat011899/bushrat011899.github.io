/* tslint:disable */
/* eslint-disable */
/**
*/
export function main(): void;
/**
*/
export class RegionJob {
  free(): void;
/**
* @param {number} job_number
* @param {number} iteration_number
* @param {number} center_x
* @param {number} center_y
* @param {number} frequency
* @param {number} k_los
* @param {number} traverses
* @param {number} region_snr
* @param {string} region_sparse
* @param {string} region_taps
*/
  constructor(job_number: number, iteration_number: number, center_x: number, center_y: number, frequency: number, k_los: number, traverses: number, region_snr: number, region_sparse: string, region_taps: string);
/**
* @returns {any}
*/
  next_point(): any;
/**
* @param {Function} f
*/
  run(f: Function): void;
/**
*/
  readonly done: boolean;
/**
*/
  job_number: number;
/**
*/
  readonly results: any[];
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_regionjob_free: (a: number) => void;
  readonly __wbg_get_regionjob_job_number: (a: number) => number;
  readonly __wbg_set_regionjob_job_number: (a: number, b: number) => void;
  readonly regionjob_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number) => number;
  readonly regionjob_results: (a: number, b: number) => void;
  readonly regionjob_done: (a: number) => number;
  readonly regionjob_next_point: (a: number) => number;
  readonly regionjob_run: (a: number, b: number) => void;
  readonly main: () => void;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
