# <%= projectName %> Audit Report
{{table-of-contents}}
## 1 Overview
### 1.1 Audit Details
* **Project Name:** <%= projectName %>
* **Tools:** [MythX](https://mythx.io/)

### 1.2 Number of vulnerabilities per severity
|       |  Num  |
| :---: | :---: |
|  High | <%= numOfHigh %> |
|  Medium |  <%= numOfMedium %> |

<% details.forEach(detail => { %>
<%- detail %>
<% }) %> 

***
***Powered By [truffle-sca2t](https://github.com/tagomaru/truffle-sca2t)***
