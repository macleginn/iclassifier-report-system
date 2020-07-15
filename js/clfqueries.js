let clfCounts = {};

let selectStyleQuery = {width: '150px'},
    selectLabelStyle = {
        'display': 'inline-block',
        'width': '100px'
    };

let clfQueries = {
    clfType: 'any',
    clfLevel: 'any',
    semRelation: 'any',
    tokenType: 'any',
    pos: 'any',
    witnessId: 'any',
    script: 'any',
    genre: 'any',
    period: 'any',
    dateFrom: 'any',
    dateTo: 'any',
    view: () => {
        populateClfDict();
        return m(
            'div',
            {
                style: {
                    display: showClfQueries ? 'block' : 'none',
                    'padding-top': '0'}
            },
            [
                m('h3', 'Subset by'),
                m('h4', {style: selectLabelStyle}, 'Level'),
                arr2Select(clfLevelArr, selectStyleQuery, e => {
                    clfQueries.clfLevel = e.target.value;
                }),
                m('br'),
                m('h4', {style: selectLabelStyle}, 'Type'),
                arr2Select(clfTypeArr, selectStyleQuery, e => {
                    clfQueries.clfType = e.target.value;
                }),
                m('br'),
                m('h4', {style: selectLabelStyle}, 'Script'),
                getSelectFromThesaurus('scripts', selectStyle, e => {
                    clfQueries.script = e.target.value;
                }),
                m('br'),
                m('h4', {style: selectLabelStyle}, 'Genre'),
                getSelectFromThesaurus('genres', selectStyle, e => {
                    clfQueries.genre = e.target.value;
                }),
                m('br'),
                m('h4', `${getTypes(clfCounts)} classifier types and ${getTokens(clfCounts)} classifier tokens`),
                m('br'),
                m('div', {style: {
                    width: '640px',
                    height: '480px',
                    padding: '4px',
                    'background-color': 'white',
                    border: '1px solid black',
                    overflow: 'auto'
                }}, extractSpans(clfCounts))
            ]
        )
    }
}

function getTypes(counter) {
    let result = 0;
    for (const k in counter)
        if (counter.hasOwnProperty(k))
            result++;
    return result;
}

function getTokens(counter) {
    let result = 0;
    for (const k in counter)
        if (counter.hasOwnProperty(k))
            result += counter[k];
    return result;
}

function populateClfDict() {
    clfCounts = {};

    for (const key in tokenData) {
		if (!tokenData.hasOwnProperty(key))
			continue;
        const tokenInfo = tokenData[key],
            clfs = extractClfsFromString(tokenInfo.mdc_w_markup);
        if (clfs.length === 0)
            continue;

        // Subset by:

        // Token metadata
        const intKey = parseInt(key);
        if (clfQueries.tokenType !== 'any') {
            let tokenType = 'simple';
            if (compoundTokens.has(intKey))
                tokenType = 'compound';
            else if (compoundParts.has(intKey))
                tokenType = 'part';
            if (tokenType !== clfQueries.tokenType)
                continue;
        }
        if (clfQueries.pos !== 'any' &&
            tokenInfo.pos !== clfQueries.pos)
            continue;

        // Witness metadata
        if (clfQueries.witnessId !== 'any' &&
            tokenInfo.wintess_id !== clfQueries.witnessId)
            continue;
        let witnessInfo = {
            genre: null,
            script: null,
            period_date_start: null,
            period_date_end: null,
            chrono_date_start: null,
            chrono_date_end: null
        };
        const witnessId = parseInt(tokenInfo.witness_id);
        if (!isNaN(witnessId) && witnessData.hasOwnProperty(witnessId)) {
            witnessInfo.genre             = witnessData[witnessId].genre;
            witnessInfo.script            = witnessData[witnessId].script;
            witnessInfo.period_date_start = witnessData[witnessId].period_date_start;
            witnessInfo.period_date_end   = witnessData[witnessId].period_date_end;
            witnessInfo.chrono_date_start = witnessData[witnessId].chrono_date_start;
            witnessInfo.chrono_date_end   = witnessData[witnessId].chrono_date_end;
        }
        if (clfQueries.genre !== 'any' &&
            clfQueries.genre !== witnessInfo.genre)
            continue;
        if (clfQueries.script !== 'any' &&
            clfQueries.script !== witnessInfo.script)
            continue;
        // TODO: dates

        // Classifier metadata
        for (const clf of clfs) {
            // If any subsetting was asked for, only
            // parsed classifiers will be shown.
            let clfParse = {
                clf_level: null,
                clf_type: null,
                semantic_relation: null
            };
            for (const clfParseKey in clfData)
                if (
                    clfData.hasOwnProperty(clfParseKey) &&
                    clfData[clfParseKey].token_id === intKey &&
                    clfData[clfParseKey].gardiner_number === clf
                ) {
                    clfParse = JSON.parse(JSON.stringify(clfData[clfParseKey]));
                    break;
                }

            if (
                clfQueries.clfLevel != 'any' &&
                clfQueries.clfLevel != clfParse.clf_level
            )
                continue;

            if (
                clfQueries.semRelation != 'any' &&
                clfQueries.semRelation != clfParse.semantic_relation
            )
                continue;

            let types = new Set();
            for (const clfType of String(clfParse.clf_type).split(';'))
                types.add(clfType);
            if (
                clfQueries.clfType != 'any' &&
                !types.has(clfQueries.clfType)
            )
                continue;

            // He made it
            if (!clfCounts.hasOwnProperty(clf))
                clfCounts[clf] = 0;
            clfCounts[clf]++;
        }
    }
}

function extractSpans(counter) {
    let result = [];
    for (const key in counter)
        if (counter.hasOwnProperty(key))
            result.push([key, counter[key]]);
    result.sort((a, b) => {
        if (a[1] > b[1])
            return -1;
        else if (a[1] < b[1])
            return 1;
        else
            return 0;
    })
    return result.map(el => m(
        'span.clf-span',
        {style: {
            padding: '2px',
            margin: '2px',
            border: '1px dotted black',
            'border-radius': '2px',
            'background-color': '#ffeecc',
            display: 'inline-block'
        },
        onclick: () => {
            getClfReport(el[0]);
            toggleClfReport(el[0]);
        }},
        `${el[0]}: ${el[1]}`));
}