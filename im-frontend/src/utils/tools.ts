const str2list = (str: string): string[] => {
    return str.split("");
};

const list2str = (list: string[]): string => {
    return list.join("");
};

export { str2list, list2str };
