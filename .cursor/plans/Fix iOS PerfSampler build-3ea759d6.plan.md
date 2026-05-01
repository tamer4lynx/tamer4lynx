<!-- 3ea759d6-879d-4fca-9308-c7f9a1d7d42b -->
---
todos:
  - id: "replace-macro"
    content: "In PerfSampler.swift, replace THREAD_BASIC_INFO_COUNT with MemoryLayout-based count (size / natural_t)."
    status: pending
  - id: "verify-build"
    content: "Re-run xcodebuild / tamer iOS build for iphonesimulator Debug and confirm tamerdevclient links."
    status: pending
isProject: false
---
# Fix iOS build: `THREAD_BASIC_INFO_COUNT` in PerfSampler

## Root cause

`xcodebuild` fails compiling [`packages/tamer-dev-client/ios/tamerdevclient/tamerdevclient/Classes/PerfSampler.swift`](packages/tamer-dev-client/ios/tamerdevclient/tamerdevclient/Classes/PerfSampler.swift) at line 131:

```text
error: cannot find 'THREAD_BASIC_INFO_COUNT' in scope
note: macro 'THREAD_BASIC_INFO_COUNT' unavailable: structure not supported
```

The SDK still defines the macro in `mach/thread_info.h` as `sizeof(thread_basic_info_data_t) / sizeof(natural_t)`, but Swift 6 / new SDK marks that macro unavailable, so it never enters the Swift name space.

## Fix (single-file, minimal)

In `readCpuPercent()`, replace:

```swift
var count = mach_msg_type_number_t(THREAD_BASIC_INFO_COUNT)
```

with the same semantics without the macro, for example:

```swift
var count = mach_msg_type_number_t(MemoryLayout<thread_basic_info>.size / MemoryLayout<natural_t>.size)
```

`Darwin.Mach` is already imported; `natural_t` and `thread_basic_info` are in scope (the rest of the function already uses `thread_basic_info()` and `thread_info`).

## Verification

Re-run the same iOS Debug simulator build (or `xcodebuild` with your existing scheme). Expect `tamerdevclient` to compile past `PerfSampler.swift`. Pod deployment-target warnings are unrelated noise.

## Risk note

If a future SDK ever made `thread_basic_info` itself non-importable, this line would need a fallback (e.g. raw `integer_t` buffer + `THREAD_INFO_MAX`, or `task_info` / host-level stats). That is not required for the current error.
