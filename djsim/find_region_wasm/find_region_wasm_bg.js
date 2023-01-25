import * as wasm from './find_region_wasm_bg.wasm';

const heap = new Array(32).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

let heap_next = heap.length;

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

const lTextDecoder = typeof TextDecoder === 'undefined' ? (0, module.require)('util').TextDecoder : TextDecoder;

let cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachedUint8Memory0 = new Uint8Array();

function getUint8Memory0() {
    if (cachedUint8Memory0.byteLength === 0) {
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

let WASM_VECTOR_LEN = 0;

const lTextEncoder = typeof TextEncoder === 'undefined' ? (0, module.require)('util').TextEncoder : TextEncoder;

let cachedTextEncoder = new lTextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedInt32Memory0 = new Int32Array();

function getInt32Memory0() {
    if (cachedInt32Memory0.byteLength === 0) {
        cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
}

let stack_pointer = 32;

function addBorrowedObject(obj) {
    if (stack_pointer == 1) throw new Error('out of js stack');
    heap[--stack_pointer] = obj;
    return stack_pointer;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_exn_store(addHeapObject(e));
    }
}
/**
*/
export class RegionJob {

    static __wrap(ptr) {
        const obj = Object.create(RegionJob.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_regionjob_free(ptr);
    }
    /**
    * @returns {number}
    */
    get job_number() {
        const ret = wasm.__wbg_get_regionjob_job_number(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} arg0
    */
    set job_number(arg0) {
        wasm.__wbg_set_regionjob_job_number(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get iteration_number() {
        const ret = wasm.__wbg_get_regionjob_iteration_number(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} arg0
    */
    set iteration_number(arg0) {
        wasm.__wbg_set_regionjob_iteration_number(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get center_x() {
        const ret = wasm.__wbg_get_regionjob_center_x(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set center_x(arg0) {
        wasm.__wbg_set_regionjob_center_x(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get center_y() {
        const ret = wasm.__wbg_get_regionjob_center_y(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set center_y(arg0) {
        wasm.__wbg_set_regionjob_center_y(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get frequency() {
        const ret = wasm.__wbg_get_regionjob_frequency(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set frequency(arg0) {
        wasm.__wbg_set_regionjob_frequency(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get k_los() {
        const ret = wasm.__wbg_get_regionjob_k_los(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set k_los(arg0) {
        wasm.__wbg_set_regionjob_k_los(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get traverses() {
        const ret = wasm.__wbg_get_regionjob_traverses(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} arg0
    */
    set traverses(arg0) {
        wasm.__wbg_set_regionjob_traverses(this.ptr, arg0);
    }
    /**
    * @returns {number}
    */
    get region_snr() {
        const ret = wasm.__wbg_get_regionjob_region_snr(this.ptr);
        return ret;
    }
    /**
    * @param {number} arg0
    */
    set region_snr(arg0) {
        wasm.__wbg_set_regionjob_region_snr(this.ptr, arg0);
    }
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
    constructor(job_number, iteration_number, center_x, center_y, frequency, k_los, traverses, region_snr, region_sparse, region_taps) {
        const ptr0 = passStringToWasm0(region_sparse, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(region_taps, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.regionjob_new(job_number, iteration_number, center_x, center_y, frequency, k_los, traverses, region_snr, ptr0, len0, ptr1, len1);
        return RegionJob.__wrap(ret);
    }
    /**
    * @param {Function} f
    */
    run(f) {
        try {
            const ptr = this.__destroy_into_raw();
            wasm.regionjob_run(ptr, addBorrowedObject(f));
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    /**
    * @returns {string}
    */
    get region_sparse() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.regionjob_region_sparse(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
    /**
    * @param {string} region_sparse
    */
    set region_sparse(region_sparse) {
        const ptr0 = passStringToWasm0(region_sparse, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.regionjob_set_region_sparse(this.ptr, ptr0, len0);
    }
    /**
    * @returns {string}
    */
    get region_taps() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.regionjob_region_taps(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
    /**
    * @param {string} region_taps
    */
    set region_taps(region_taps) {
        const ptr0 = passStringToWasm0(region_taps, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.regionjob_set_region_taps(this.ptr, ptr0, len0);
    }
}

export function __wbindgen_object_drop_ref(arg0) {
    takeObject(arg0);
};

export function __wbindgen_string_new(arg0, arg1) {
    const ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
};

export function __wbindgen_number_new(arg0) {
    const ret = arg0;
    return addHeapObject(ret);
};

export function __wbindgen_bigint_from_u64(arg0) {
    const ret = BigInt.asUintN(64, arg0);
    return addHeapObject(ret);
};

export function __wbindgen_object_clone_ref(arg0) {
    const ret = getObject(arg0);
    return addHeapObject(ret);
};

export function __wbindgen_error_new(arg0, arg1) {
    const ret = new Error(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
};

export function __wbg_set_20cbc34131e76824(arg0, arg1, arg2) {
    getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
};

export function __wbg_log_4b5638ad60bdc54a(arg0) {
    console.log(getObject(arg0));
};

export function __wbg_now_8172cd917e5eda6b(arg0) {
    const ret = getObject(arg0).now();
    return ret;
};

export function __wbg_newnoargs_b5b063fc6c2f0376(arg0, arg1) {
    const ret = new Function(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
};

export function __wbg_get_765201544a2b6869() { return handleError(function (arg0, arg1) {
    const ret = Reflect.get(getObject(arg0), getObject(arg1));
    return addHeapObject(ret);
}, arguments) };

export function __wbg_call_97ae9d8645dc388b() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).call(getObject(arg1));
    return addHeapObject(ret);
}, arguments) };

export function __wbg_new_0b9bfdd97583284e() {
    const ret = new Object();
    return addHeapObject(ret);
};

export function __wbg_self_6d479506f72c6a71() { return handleError(function () {
    const ret = self.self;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_window_f2557cc78490aceb() { return handleError(function () {
    const ret = window.window;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_globalThis_7f206bda628d5286() { return handleError(function () {
    const ret = globalThis.globalThis;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_global_ba75c50d1cf384f4() { return handleError(function () {
    const ret = global.global;
    return addHeapObject(ret);
}, arguments) };

export function __wbindgen_is_undefined(arg0) {
    const ret = getObject(arg0) === undefined;
    return ret;
};

export function __wbg_call_168da88779e35f61() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
    return addHeapObject(ret);
}, arguments) };

export function __wbindgen_debug_string(arg0, arg1) {
    const ret = debugString(getObject(arg1));
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbindgen_throw(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

