export class Environment {
    private readonly functions: {[name: string]: (...params: any[]) => any} = {}
    
    addFunction(name: string, fn: (...params: any[]) => any) {
        this.functions[name] = fn;
    }
    
    invokeFunction(name: string, params: any[]): any {
        if(Object.keys(this.functions).indexOf(name) < 0) {
            throw new Error(`Function "${name}" not found`);
        }
        return this.functions[name].apply(this, params);
    }
}
