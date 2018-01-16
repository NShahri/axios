/**
 * Test if headers contains key (in case sensetive) and the value as expected
 * @param headers {object}
 * @param key {string}
 * @param val {string}
 */
function testHeaderValue(headers, key, val) {
  var found = false;

  for (var k in headers) {
    if (k.toLowerCase() === key.toLowerCase()) {
      found = true;
      expect(headers[k]).toEqual(val);
      break;
    }
  }

  if (!found) {
    if (typeof val === 'undefined') {
      expect(headers.hasOwnProperty(key)).toEqual(false);
    } else {
      throw new Error(key + ' was not found in headers');
    }
  }
}

module.exports.testHeaderValue = testHeaderValue;