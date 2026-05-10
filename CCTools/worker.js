self.onmessage = function(e) {
    const { reqX, reqY, recipe } = e.data;
    const result = solveDPOptimal(reqX, reqY, recipe);
    self.postMessage(result);
};

function solveDPOptimal(reqX, reqY, recipe) {
    let swapped = false;
    let X = reqX;
    let Y = reqY;
    if (X > Y) {
        X = reqY;
        Y = reqX;
        swapped = true;
    }

    const numBases = recipe.hasParentB ? 3 : 2;

    const powB = new Int32Array(X + 1);
    powB[0] = 1;
    for (let i = 1; i <= X; i++) powB[i] = powB[i - 1] * numBases;

    const num_states = powB[X];
    const maskA = new Int32Array(num_states);
    const maskB = new Int32Array(num_states);
    const maskEmpty = new Int32Array(num_states);

    for (let R = 0; R < num_states; R++) {
        let m_A = 0, m_B = 0, m_E = 0;
        for (let c = 0; c < X; c++) {
            let val = Math.floor(R / powB[c]) % numBases;
            if (val === 0) m_E |= (1 << c);
            else if (val === 1) m_A |= (1 << c);
            else if (val === 2) m_B |= (1 << c);
        }
        maskA[R] = m_A;
        maskB[R] = m_B;
        maskEmpty[R] = m_E;
    }

    const countA_R = new BigInt64Array(num_states);
    const countA_curr = new BigInt64Array(num_states);
    const countB_R = new BigInt64Array(num_states);
    const countB_curr = new BigInt64Array(num_states);

    for (let R = 0; R < num_states; R++) {
        let a_all = 0n, a_curr = 0n;
        let b_all = 0n, b_curr = 0n;
        for (let c = 0; c < X; c++) {
            let a = 0, a_c = 0, b = 0, b_c = 0;
            if (c > 0) {
                if ((maskA[R] & (1 << (c - 1))) !== 0) { a++; a_c++; }
                if ((maskB[R] & (1 << (c - 1))) !== 0) { b++; b_c++; }
            }
            if ((maskA[R] & (1 << c)) !== 0) a++;
            if ((maskB[R] & (1 << c)) !== 0) b++;
            if (c < X - 1) {
                if ((maskA[R] & (1 << (c + 1))) !== 0) { a++; a_c++; }
                if ((maskB[R] & (1 << (c + 1))) !== 0) { b++; b_c++; }
            }
            a_all |= (BigInt(a) << BigInt(c * 4));
            a_curr |= (BigInt(a_c) << BigInt(c * 4));
            b_all |= (BigInt(b) << BigInt(c * 4));
            b_curr |= (BigInt(b_c) << BigInt(c * 4));
        }
        countA_R[R] = a_all;
        countA_curr[R] = a_curr;
        countB_R[R] = b_all;
        countB_curr[R] = b_curr;
    }

    const statesSq = num_states * num_states;
    let dp_prev = new Int8Array(statesSq).fill(-1);
    let dp_curr = new Int8Array(statesSq).fill(-1);
    
    let parent = new Array(Y);
    for(let i = 0; i < Y; i++) {
        parent[i] = new Int16Array(statesSq);
    }

    const { minA, maxA, minB, maxB } = recipe;
    const log2Map = new Int32Array(256);
    for(let i=0; i<8; i++) log2Map[1<<i] = i;

    for (let R0 = 0; R0 < num_states; R0++) {
        let empty0 = maskEmpty[R0];
        if (empty0 === 0) {
            for (let R1 = 0; R1 < num_states; R1++) {
                dp_prev[R0 * num_states + R1] = 0;
            }
            continue;
        }

        for (let R1 = 0; R1 < num_states; R1++) {
            let a_all = countA_curr[R0] + countA_R[R1];
            let b_all = countB_curr[R0] + countB_R[R1];
            
            let score = 0;
            let empty = empty0;
            while (empty > 0) {
                let lowestBit = empty & -empty;
                let c = log2Map[lowestBit];
                let a_count = Number((a_all >> BigInt(c * 4)) & 0xFn);
                let b_count = Number((b_all >> BigInt(c * 4)) & 0xFn);
                
                if (a_count >= minA && a_count <= maxA && b_count >= minB && b_count <= maxB) {
                    score++;
                }
                empty &= empty - 1;
            }
            dp_prev[R0 * num_states + R1] = score;
        }
    }

    for (let i = 1; i < Y; i++) {
        dp_curr.fill(-1);
        let parent_i = parent[i];
        
        for (let R_curr = 0; R_curr < num_states; R_curr++) {
            let empty_curr = maskEmpty[R_curr];
            if (empty_curr === 0) {
                for (let R_next = 0; R_next < num_states; R_next++) {
                    let max_score = -1;
                    let best_prev = -1;
                    let idxBase = R_curr * num_states;
                    for (let R_prev = 0; R_prev < num_states; R_prev++) {
                        let sc = dp_prev[R_prev * num_states + R_curr];
                        if (sc > max_score) {
                            max_score = sc;
                            best_prev = R_prev;
                        }
                    }
                    if (max_score >= 0) {
                        dp_curr[idxBase + R_next] = max_score;
                        parent_i[idxBase + R_next] = best_prev;
                    }
                }
                continue;
            }

            let bA_curr = countA_curr[R_curr];
            let bB_curr = countB_curr[R_curr];

            for (let R_next = 0; R_next < num_states; R_next++) {
                let max_score = -1;
                let best_prev = -1;
                
                let base_a = bA_curr + countA_R[R_next];
                let base_b = bB_curr + countB_R[R_next];

                for (let R_prev = 0; R_prev < num_states; R_prev++) {
                    let prev_score = dp_prev[R_prev * num_states + R_curr];
                    if (prev_score < 0) continue;

                    let a_all = base_a + countA_R[R_prev];
                    let b_all = base_b + countB_R[R_prev];
                    
                    let score = 0;
                    let empty = empty_curr;
                    while (empty > 0) {
                        let lowestBit = empty & -empty;
                        let c = log2Map[lowestBit];
                        let a_count = Number((a_all >> BigInt(c * 4)) & 0xFn);
                        let b_count = Number((b_all >> BigInt(c * 4)) & 0xFn);
                        if (a_count >= minA && a_count <= maxA && b_count >= minB && b_count <= maxB) {
                            score++;
                        }
                        empty &= empty - 1;
                    }

                    if (prev_score + score > max_score) {
                        max_score = prev_score + score;
                        best_prev = R_prev;
                    }
                }

                if (max_score >= 0) {
                    dp_curr[R_curr * num_states + R_next] = max_score;
                    parent_i[R_curr * num_states + R_next] = best_prev;
                }
            }
        }
        
        let temp = dp_prev;
        dp_prev = dp_curr;
        dp_curr = temp;
    }

    let final_max_score = -1;
    let best_R_Y_1 = 0;

    for (let R = 0; R < num_states; R++) {
        if (dp_prev[R * num_states + 0] > final_max_score) {
            final_max_score = dp_prev[R * num_states + 0];
            best_R_Y_1 = R;
        }
    }

    let best_rows = new Int32Array(Y);
    best_rows[Y - 1] = best_R_Y_1;
    let curr_next = 0;
    let curr = best_R_Y_1;

    for (let i = Y - 1; i > 0; i--) {
        let prev = parent[i][curr * num_states + curr_next];
        best_rows[i - 1] = prev;
        curr_next = curr;
        curr = prev;
    }

    let finalGrid = [];
    for (let r = 0; r < Y; r++) {
        let row_state = best_rows[r];
        let rowData = [];
        for (let c = 0; c < X; c++) {
            rowData.push(Math.floor(row_state / powB[c]) % numBases);
        }
        finalGrid.push(rowData);
    }

    if (swapped) {
        let tGrid = [];
        for (let r = 0; r < reqY; r++) {
            let rowData = [];
            for (let c = 0; c < reqX; c++) {
                rowData.push(finalGrid[c][r]);
            }
            tGrid.push(rowData);
        }
        finalGrid = tGrid;
    }

    return { grid: finalGrid, score: final_max_score };
}
