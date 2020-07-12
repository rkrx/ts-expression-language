export class Source {
    private backlog: string = '';

    constructor(private src: string) {}

    noMoreData() {
        return this.src.trimStart() === '';
    }

    startsWith(match: string|RegExp): boolean {
        if(match instanceof RegExp) {
            return this.src.match(match) !== null;
        }
        return this.src.substr(0, match.length) === `${match}`;
    }

    peek(characters: number): string {
        return this.src.substr(0, characters);
    }

    peekBack(characters: number): string {
        return this.backlog.substr(-characters, characters);
    }

    getLine(): number {
        const result = this.backlog.match(/\r?\n/g);
        if(result !== null) {
            return result.length + 1;
        }
        return 1;
    }

    getColumn(): number {
        const result = this.backlog.match(/(?:^|\r?\n)([^\n]*)$/);
        if(result !== null) {
            return result[1].length + 1;
        }
        return 0;
    }

    getIndex() {
        return this.backlog.length;
    }

    setIndex(index: number) {
        const source = `${this.backlog}${this.src}`;
        this.backlog = source.substr(0, index);
        this.src = source.substr(index);
    }

    skipWhitepace() {
        const res = this.src.match(/^\s*/);
        if(res !== null) {
            this.read(res[0].length);
        }
    }

    read(characters: number): string {
        const res = this.src.substr(0, characters);
        this.backlog = this.backlog + res;
        this.src = this.src.substr(characters);
        return res;
    }
    
    readPattern(match: string|RegExp): string {
        let str = '';
        if(match instanceof RegExp) {
            const res = this.src.match(match);
            if(res) {
                str = res[0];
            } else {
                throw new Error('No match');
            }
        } else {
            str = this.src.substr(0, match.length);
        }
        const before = this.src;
        this.backlog += this.src.substr(0, str.length);
        this.src = this.src.substr(str.length);
        return str;
    }

    tryThis<T>(fn: () => T|null): T|null {
        const index = this.getIndex();
        const result = fn();
        if(result === null) {
            this.setIndex(index);
            return null;
        }
        return result;
    }

    toString(): string {
        return this.src;
    }
}