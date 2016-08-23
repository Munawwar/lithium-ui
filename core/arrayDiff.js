define([], function () {
    /**
     * This array diff algorithm is useful when one wants to detect small changes
     * (like consecutive insertions or consecutive deletions) several times
     * in short time intervals. Alternative algorithms like LCS woud be too expensive
     * when running it too many times.
     */

    //Algo 1 - Here index of both arrays are incremented when unequal
    //Good for detecting appends and pops(). For arrays of equal length this would be good to detect replace ops.
    function arrayDiff1(n, o) {
        var i, j; //i is for n's index and j for o's index

        var changes = [];
        for (i = 0, j = 0; i < n.length && j < o.length; i += 1, j += 1) {
            if (n[i] !== o[j]) {
                changes.push({
                    replace: true,
                    op: 'replace',
                    value: n[i],
                    index: j
                });
            }
        }
        for (; i < n.length; i += 1) { //if more items from n remains
            changes.push({
                insert : true,
                op: 'insert',
                value: n[i],
                index: i
            });
        }
        for (var end = j; j < o.length; j += 1) { //if more items from o remains
            changes.push({
                remove : true,
                op: 'remove',
                value: o[j],
                index: end
            });
        }

        return changes;
    }
    //Algo 2 - Here index of new array is incremented when unequal
    //Good for detecting a newly added item
    function arrayDiff2(n, o) {
        var i, j; //i is for n's index and j for o's index

        var changes = [],
            d = 0; // "displacement". The difference between j and index of insertion or deletion.
        for (i = 0, j = 0; i < n.length && j < o.length;) {
            if (n[i] === o[j]) {
                i += 1;
                j += 1;
            } else {
                changes.push({
                    insert: true,
                    op: 'insert',
                    value: n[i],
                    index: j + d
                });
                d += 1;
                i += 1;
            }
        }
        for (; i < n.length; i += 1) { //if more items from n remains
            changes.push({
                insert : true,
                op: 'insert',
                value: n[i],
                index: j + d
            });
            d += 1;
        }
        for (; j < o.length; j += 1) { //if more items from o remains
            changes.push({
                remove : true,
                op: 'remove',
                value: o[j],
                index: j + d
            });
            d -= 1;
        }

        return changes;
    }
    //Algo 3 - Here index of old array is incremented when unequal
    //Good for detecting a removed item
    function arrayDiff3(n, o) {
        var i, j; //i is for n's index and j for o's index

        var changes = [],
            d = 0; // "displacement". The difference between j and index of insertion or deletion.
        for (i = 0, j = 0; i < n.length && j < o.length;) {
            if (n[i] === o[j]) {
                i += 1;
                j += 1;
            } else {
                changes.push({
                    remove: true,
                    op: 'remove',
                    value: o[j],
                    index: j + d
                });
                d -= 1;
                j += 1;
            }
        }
        for (; i < n.length; i += 1) { //if more items from n remains
            changes.push({
                insert : true,
                op: 'insert',
                value: n[i],
                index: j + d
            });
            d += 1;
        }
        for (; j < o.length; j += 1) { //if more items from o remains
            changes.push({
                remove : true,
                op: 'remove',
                value: o[j],
                index: j + d
            });
            d -= 1;
        }

        return changes;
    }

    function batchChanges(changes) {
        changes.forEach(function (change, i) {
            var len = changes.length;
            change.batch = [change.value];
            delete change.value;

            //look forward for similar changes.
            for (var j = i + 1; j < len && changes[j].op === change.op; j += 1) {
                change.batch.push(changes[j].value);
            }
            if (j > (i + 1)) {
                changes.splice(i + 1, j - (i + 1));
            }
        });
        return changes;
    }

    // Chooses the changes from the alogirthm that returns least changes.
    // Computational complexity is  O(3 * (n.length + o.length)) ~ O(N)  - where N is sum of lengths.
    // Best time is O(n.length + o.length) (when arrays are equal).
    /**
     * @param {Array} n The new array
     * @param {Array} o The old array
     */
    return function arrayDiff(n, o) {
        var diff2 = arrayDiff2(n, o);
        if (diff2.length <= 1 || !o.length || !n.length) {
            return batchChanges(diff2);
        }

        var diff3 = arrayDiff3(n, o);
        if (diff3.length <= 1) {
            return batchChanges(diff3);
        }

        var changesFromDiffAlgos = [
            diff2,
            diff3,
            arrayDiff1(n, o)
        ];

        var leastChanges;
        changesFromDiffAlgos.forEach(function (changes) {
            if (!leastChanges || (changes.length < leastChanges.length)) {
                leastChanges = changes;
            }
        });
        return batchChanges(leastChanges);
    };
});
