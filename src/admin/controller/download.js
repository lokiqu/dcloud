'use strict';

import Base from './base.js';
import fs from 'fs';

export default class extends Base {

    async clientAction() {
        let filePath = think.ROOT_PATH + '/bin/probe.js';
        let probe = await this.probe();

        // 生成配置文件
        fs.writeFileSync(filePath, probe, 'utf-8');

        this.download(filePath,'probe.asp');
    }

    async probeAction() {
        let probe = await this.probe();

        return this.json(probe);
    }

    async shellAction() {
        const programData = await  this.model('program').where({id: 2}).find();

        let buffer = this.getShellContent({
            domain: 'http://:' + this.http.host,
            appid: programData.id,
            appName: '',
            appPath: programData.path,
            appUrl: programData.config,
            proxy: false
        });

        return this.json(buffer);
    }

    probe() {
        const configData = this.model('config').find();

        let buffer = this.getProbeContent(configData.apiKey);

        return buffer;
    }


    getProbeContent(apiKey) {
        let domain = 'http://172.16.97.13:8361';

        let str = `
<%@LANGUAGE="VBSCRIPT" CODEPAGE="65001"%>
<%
Response.CharSet= "UTF-8"

dim apiKey, domain
apiKey = "${apiKey}"
domain = "${domain}"    'http://172.16.97.13:8361/api/applog

dim shellName, shellPath


dim key, username, password, appId

key = request.QueryString("key")
username = request.QueryString("username")
password = request.QueryString("password")
shellName = request.QueryString("shellName")
shellPath = request.QueryString("shellPath")

if apiKey <> "" and key = apiKey and username <> "" then
    setUserPassword username,password
    if err <> 0 then
        response.write "{""resultCode"":""5000"",""resultMsg"":""注册失败""}"
    else
        response.write "{""resultCode"":""0"",""resultMsg"":""注册成功""}"
    end if

elseif appid <> "" then
    response.write file_get_contents(domin&"?userId="&username&"&appId="&appid, "userId="&username&"&appId="&appid)

elseif shellName <> "" and shellPath <> "" then
    shell_content(shellName,shellPath)
else
    response.write "{""resultCode"":""5000"",""resultMsg"":""校验失败""}"
end if

function setUserPassword(username, password)
    On Error Resume Next
    dim oSystem,oUser,oGroup

    Set oSystem=GetObject("WinNT://127.0.0.1")

    Set oUser=oSystem.GetObject("user",username)

    if err <> 0 then
        err = 0
        Set oUser=oSystem.Create("user",username)
        oUser.SetPassword password
        oUser.Put "userFlags", &h10040
        oUser.Setinfo

        Set oGroup=oSystem.GetObject("Group","Users")
        oGroup.Add ("winnt://"&username)
    else
        oUser.SetPassword password
        oUser.Setinfo
    end if
end function

Function file_get_contents(url,data)
 Dim objXML:Set   objXML   =   server.CreateObject( "Microsoft.XMLHTTP")
	'objXML.open   "GET ",   url,   False
	objXML.open   "POST",   url,   False
	objXML.send(data)
	If objXml.Readystate=4 Then
	 file_get_contents=     objXML.responSetext
	Else
	 file_get_contents=0
	End If
 Set objXML=Nothing
End Function

Function shell_content(name, path)
    dim fileName
    dim content

    fileName = name&".bat"

    content ="@echo off"&vbcrlf
    content =content&"set f2etestDomain=${domain}"&vbcrlf
    content =content&"set appid=ie6"&vbcrlf
    content =content&""&vbcrlf
    content =content&""&vbcrlf
    content =content&"start /MAX "" "&path&" """&vbcrlf
    content =content&""&vbcrlf

    CreateFile fileName, content
end Function

Function CreateFile(FileName,Content)
    on error resume next

    FileName=Server.Mappath(FileName)
    Set FSO = Server.CreateObject("Scripting.FileSystemObject")
    set fd=FSO.createtextfile(FileName,true)
    fd.writeline Content

    if err>0 then
      err.clear
      CreateFile=False
    else
      CreateFile=True
    end if
End function
%>
        `;

        return str;
    }

    getShellContent(options) {
        let str = `
@echo off

set domain=${options.domain}
set appid=${options.appid}

rem 命令行参数
set proxymode="%1"
set proxyurl=%2
set url=%3
set apiKey=%4

rem 探测桌面模式
set isWeb=1
if %url% equ desktop (
	set url="about:blank"
	set isWeb=0
)

rem 设置代理
set proxypath="HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings"
reg add %proxypath% /v "ProxyEnable" /t REG_DWORD /d 0 /f>nul
set proxydef=
if %proxyurl% equ "" set proxydef=1
if %proxyurl% equ default set proxydef=1
if %proxyurl% equ "default" set proxydef=1
if defined proxydef set proxyurl="http://%domain%/getHostsPac?name=%USERNAME%"
if %proxymode% equ "noproxy" (
	set proxyurl=""
)
if %proxyurl% neq "" (
	rem 开启代理
	reg add %proxypath% /v "AutoConfigURL" /d %proxyurl% /f >nul
) else (
	rem 关闭代理
	reg delete %proxypath% /v "AutoConfigURL" /f > nul
)

rem 打开应用
start /MAX "" "${options.appPath}" %url% %proxyParam%

rem 打点统计
start "" curl "http://%domain%/applog?userid=%USERNAME%&appid=%appid%&isweb=%isWeb%"
        `;

        return str;
    }

}