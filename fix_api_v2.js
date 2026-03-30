import fs from 'fs';

const path = 'c:/Users/hp/Desktop/Recharge/src/api/AuthApi.js';
let content = fs.readFileSync(path, 'utf8');

const target = '    return JSON.parse(text);\r\n  } catch (error) {\r\n    return { success: false, message: error.message || "Network error" };\r\n  }\r\n};';
const target2 = '    return JSON.parse(text);\n  } catch (error) {\n    return { success: false, message: error.message || "Network error" };\n  }\n};';

const replacement = `    const json = JSON.parse(text);
    const apiSuccess = json?.success === true || json?.data?.status === 'SUCCESS';
    const apiMessage = json?.data?.message || json?.message || (apiSuccess ? "Payment successful" : "Payment failed");

    // Return a unified structure that the UI can rely on
    return {
      ...json,
      success: apiSuccess,
      message: apiMessage
    };
  } catch (error) {
    return { success: false, message: error.message || "Network error" };
  }
};`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content);
    console.log('Modified successfully (CRLF)');
} else if (content.includes(target2)) {
    content = content.replace(target2, replacement);
    fs.writeFileSync(path, content);
    console.log('Modified successfully (LF)');
} else {
    console.log('Target not found');
    const index = content.indexOf('return JSON.parse(text);');
    if (index !== -1) {
        console.log('Found "return JSON.parse(text);" at index ' + index);
        console.log('Context: ' + JSON.stringify(content.substring(index, index + 150)));
    }
}
