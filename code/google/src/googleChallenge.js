// INFO // function to format JSON object to ASCII string
const formatOutput = (variables) => {
    const firstLine = `${variables.scheduleCount}\n`
    const body = variables.intersectionRules.map((rule, index) => {
        const lineOne = `${rule.index}\n`;
        const lineTwo = `${rule.incomingStreetsCount}\n`;
        const ruleList = rule.rulesArray.map(obj => {
            return obj.street + ' ' + obj.duration;
        });
        if (index % 200 === 0) console.log(`UPDATE: Compiled ${index} / ${variables.intersectionRules.length} output lines`)
        return `${lineOne}${lineTwo}${ruleList.join('\n')}`;
    });
    return `${firstLine}${body.join('\n')}`;
};

const check = (string) => {
    // INFO // parse string and set variables
    const arrayOfLines = string.split('\n');
    const inputVariables = {
        simulationDuration: 0,
        intersectionCount: 0,
        streetCount: 0,
        carCount: 0,
        points: 0
    };
    const outputVariables = {
        scheduleCount: 0,
        intersectionRules: []
    };
    let arrayOfStreets = [];
    let intersectionArray = [];
    const carRoutes = [];
    // INFO // set streets array and car routes from the parsed input lines
    for (let index = 0; index < arrayOfLines.length; index++) {
        const line = arrayOfLines[index];
        const variables = line.split(' ');
        if (index === 0) {
            // INFO // set main variables
            inputVariables.simulationDuration = Number(variables[0]);
            inputVariables.intersectionCount = Number(variables[1]);
            inputVariables.streetCount = Number(variables[2]);
            inputVariables.carCount = Number(variables[3]);
            inputVariables.points = Number(variables[4]);
        } else if (0 < index && index < inputVariables.streetCount + 1) {
            // INFO // add street data
            const street = {
                startIntersection: variables[0],
                endIntersection: variables[1],
                name: variables[2],
                duration: variables[3],
                utilized: false
            }
            arrayOfStreets.push(street);
        } else {
            // INFO // add car routes
            const numberOfStreets = Number(variables[0]);
            const streetArray = [];
            variables.splice(0, 1);
            variables.forEach((street, index) => {
                if (index + 1 !== variables.length) {
                    const key = arrayOfStreets.map(streetInfo => streetInfo.name).indexOf(street);
                    arrayOfStreets[key].utilized = true;
                    streetArray.push({
                        street,
                        endIntersection: arrayOfStreets[key].endIntersection,
                        duration: arrayOfStreets[key].duration
                    });
                }
            });
            const route = {
                numberOfStreets,
                streets: streetArray
            }
            carRoutes.push(route);
        }
        if (index === arrayOfLines.length - 1) console.log(`UPDATE: Broke up all input lines`);
    }
    // INFO // set number of intersections, with their index (name)
    let count = 0;
    arrayOfStreets = arrayOfStreets.filter(street => {
        if (street.utilized) {
            intersectionArray.push({
                index: count,
                incomingStreets: []
            });
            count ++;
            return street;
        }
    });
    // INFO // filter intersections array to only hold intersections with an incoming street
    // INFO // (intersections without incoming streets will always have red light)
    intersectionArray = intersectionArray.filter(intersection => {
        const incomingStreets = arrayOfStreets.filter(street => {
            if (street.endIntersection == intersection.index) {
                return street;
            }
        }).map(street => street.name);
        intersectionArray[intersection.index].incomingStreets = incomingStreets;
        if (incomingStreets.length > 0) {
            return intersection;
        }
    });
    // INFO // set first line of output (amount of intersection rules needed)
    outputVariables.scheduleCount = intersectionArray.length;
    console.log('UPDATE: Set schedule count');
    // INFO // set basic rule objects
    intersectionArray.forEach((intersection, index) => {
        const intersectionRule = {
            index,
            incomingStreetsCount: intersection.incomingStreets.length,
            incomingStreets: intersection.incomingStreets,
            rulesArray: []
        }
        if (intersection.incomingStreets.length === 1) {
            const rule = {
                street: intersection.incomingStreets[0],
                duration: 1
            }
            intersectionRule.rulesArray.push(rule);
        } else if (intersection.incomingStreets.length > 1) {
            intersection.incomingStreets.forEach(street => {
                const rule = {
                    street: street,
                    duration: 0
                }
                intersectionRule.rulesArray.push(rule);
            });
        }
        outputVariables.intersectionRules.push(intersectionRule);
        if (index === intersectionArray.length - 1) console.log(`UPDATE: Processed all basic intersections`);
    });
    outputVariables.intersectionRules.forEach((item, intersectionIndex) => {
        // INFO // set advanced rule object variables
        let contactPoints = [];
        carRoutes.filter(route => {
            if (route.streets.map(obj => Number(obj.endIntersection)).includes(item.index)) {
                return route;
            }
        }).forEach(route => {
            // INFO // start at 1 second since you start at the end of the first street on car route
            let pointOfContact = 1;
            let timeRemaining = 0;
            let streetName;
            for (let idx = 0; idx < route.streets.length; idx++) {
                const street = route.streets[idx];
                if (!streetName) {
                    if (idx !== 0) {
                        pointOfContact = pointOfContact + Number(street.duration);
                    }
                    if (street.endIntersection == item.index) {
                        streetName = street.street;
                    }
                } else {
                    timeRemaining = timeRemaining + Number(street.duration);
                }
            }
            if (streetName) contactPoints.push({ pointOfContact, streetName, timeRemaining });
        });
        contactPoints = contactPoints.sort((a, b) => a.pointOfContact < b.pointOfContact ? -1 : 1);
        // INFO // set advanced rule object duration
        for (let idx = 0; idx < contactPoints.length; idx++) {
            const contact = JSON.parse(JSON.stringify((contactPoints[idx])));
            if (idx === 0) {
                const dur = contact.pointOfContact + 1;
                outputVariables.intersectionRules[intersectionIndex].rulesArray.forEach(rule => {
                    if (rule.duration === 0 && rule.street === contact.streetName) {
                        rule.duration = dur > 0 ? dur : 1;
                    }
                })
            } else {
                const dur = contact.pointOfContact - contactPoints[idx - 1].pointOfContact;
                outputVariables.intersectionRules[intersectionIndex].rulesArray.forEach(rule => {
                    if (rule.duration === 0 && rule.street === contact.streetName) {
                        rule.duration = dur > 0 ? dur : 1;
                    }
                })
            }
        }
        if (intersectionIndex % 50 === 0) console.log(`UPDATE: Processed ${intersectionIndex} / ${outputVariables.intersectionRules.length} advanced intersections`);
    });
    // INFO // return ASCII output
    return formatOutput(outputVariables);
}