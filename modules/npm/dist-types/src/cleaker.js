import { parseTarget } from './parse/parseTarget';
import { createRemotePointer } from './pointer/remotePointer';
import { bindKernel } from './binder';
export function cleaker(input, options = {}) {
    if (typeof input === 'string') {
        const parsed = parseTarget(input, { defaultMode: 'reactive' });
        return createRemotePointer(parsed, options);
    }
    return bindKernel(input, options);
}
export default cleaker;
//# sourceMappingURL=cleaker.js.map