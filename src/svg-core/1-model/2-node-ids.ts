/** Internal node id, unique for the lifetime of the page */
export function newNodeId(): string {
    return `n${++lastId}`;
}

let lastId = 0;
