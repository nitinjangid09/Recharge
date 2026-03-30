import fs from 'fs';

const path = 'c:/Users/hp/Desktop/Recharge/src/api/AuthApi.js';
let content = fs.readFileSync(path, 'utf8');

const target = '    return JSON.parse(text);\r\n  } catch (error) {\r\n    return { success: false, message: error.message || "Network error" };\r\n  }\r\n};';
const target2 = '    return JSON.parse(text);\n  } catch (error) {\n    return { success: false, message: error.message || "Network error" };\n  }\n};';

const replacement = `    const json = JSON.parse(text);
    const isSuccess = json?.success === true || json?.data?.status === 'SUCCESS';
    const message = json?.data?.message || json?.message || (isSuccess ? "Payment successful" : "Payment failed");
    return { ...json, success: isSuccess, message };
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
    console.log('Excerpt around expected target:');
    const index = content.indexOf('return JSON.parse(text);');
    if (index !== -1) {
        console.log(JSON.stringify(content.substring(index, index + 100)));
    }
}
