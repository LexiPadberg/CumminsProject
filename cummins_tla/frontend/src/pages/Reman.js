import React, { useRef, useEffect } from "react";
import Button from "react-bootstrap/Button";
import NavBar from "./components/NavBar";
import placeholder_label from "./components/placeholder_label.png"
import {useSelector} from "react-redux";
import jsPDF from "jspdf";
import { useState } from "react";
import { apiWrapper } from "../apiWrapper"
import { getDateTime } from "../dateTime";

export default function Reman(){
    //handles focusing input box
    const inputElement = useRef(null);
    useEffect(() => {
    if (inputElement.current) {
      inputElement.current.focus();
    }
  }, []);
    const user = useSelector(state => state.user);
    const date = getDateTime('date');

    const [zpl, setZpl] = useState(null);
    const [notification, setNotification] = useState(null);

    const handleReman = async () => {
        const item_segment1 = document.getElementById("remanInput").value.toString();
        const validationRegex = /^\d{7,8}\-RX$/;
        if (validationRegex.test(item_segment1)){
            try {
                const input = {item:item_segment1};
                const temp = await apiWrapper('api/reman', 'GET', input);
                if(temp.success)
                {
                    generateLabel(item_segment1);
                } else {
                    setNotification('Incorrect part number');
                    setTimeout(() => setNotification(''), 5000);
                }
            } catch (error) {
                console.error('Error: ', error);
                setNotification('Internal server error');
                setTimeout(() => setNotification(''), 5000);
            }
        } else {
            setNotification('Invalid part number');
            setTimeout(() => setNotification(''), 5000);
        }
    };

    const generateLabel = (item_segment1)  =>{
        //getting components for time and date
        const currentDate = new Date();
        const time = getDateTime('time');
       
        const twoDigitYear = currentDate.getFullYear().toString().slice(-2);

        let start = new Date(currentDate.getFullYear(), 0, 0);
        let diff = (currentDate - start) + ((start.getTimezoneOffset() - currentDate.getTimezoneOffset()) * 60 * 1000);
        let oneDay = 1000 * 60 * 60 * 24;
        let dayOfYear = Math.floor(diff / oneDay).toString().padStart(3,'0');

        const serial = handleSerial().toString().padStart(4,'0');

        const itemsegment = item_segment1.toString().padStart(11,'0');

        const matrixContent = `P${itemsegment}S${twoDigitYear}${dayOfYear}${serial}V0TDRC`;
        //P0xxxxxxx-rxSYYJJJSSSSVTDRC

        // ZPL content for the label
        const zpl =
        `^XA
        ^FX Barcode and associated text
        ^FO20,0^ADN,30,20^BCN,30,Y,N,N,N
        ^FD${itemsegment}^FS
        
        ^FX Logo
        ^FO15,80^GFA,480,480,8,,L07JFE1FE,K07KFCC7E,J03LFC03E,J0LFC233E,I03KF7C187E,I07JFE3110FE,001KFEE18FFE,003LF91C7FE,007LF88DFFE,00LFC847FFE, 01LF844IFE,01LF023IFE,03KFC613IFE,07KF831JFE,07JFE239JFE,0KFC71KFE,0KF638KFE,1JFE11BKFE,1JFC10LFE,3JF189LFE,3IFE1C7LFE,3IF98C6,3IF18F8,7FFD0C6,7FF88EC,7DFC47C,78CC278,60C62F8,61C71F8,47E0FF8,47F0FF8,478BFF8,410IFC,601IFE,703JF,3CKFC,3SFE,:1SFE,::0SFE,:07RFE,03RFE,:01RFE,00RFE,007QFE,003QFE,001QFE,I0QFE,I03PFE,I01PFE,J07OFE,K0OFE!K01NFEDM03LFC,,^FS
        
        ^FX Date/Time
        ^FO80,85^ACN,10,10^FD${time}^FS
        ^FO80,120^ACN,10,10^FD${date}^FS
        
        ^FX User ID
        ^FO210,90^AQN,1,1,^FD${user.userid}^FS
        
        ^FX Data matrix content text
        ^FO25,160^ADN,10,10
        ^FD${matrixContent}^FS
        
        ^FX Data Matrix
        ^FO290,50^BXN,5,200,20,20,3,,1
        ^FD${matrixContent}^FS
        ^XZ`;

        setZpl(zpl);

        requestLabelPreview(zpl);
    };

    async function requestLabelPreview(zpl){
        console.log(zpl);
        const dpmm = 8;
        const width = 2;
        const height = 1;
        try{
            const response = await fetch(`http://api.labelary.com/v1/printers/${dpmm}dpmm/labels/${width}x${height}/0/${zpl}/`,
            {
                method:"GET",
                headers:{
                    'Accept':'image/png',
                },
            });
            const responseBlob = await response.blob();
            const imgsrc = URL.createObjectURL(responseBlob);
            document.getElementById("remanLabelPreview").setAttribute('src', imgsrc.toString());

        } catch (error) {
            console.error('Error: ', error);
            setNotification('Internal server error');
            setTimeout(() => setNotification(''), 5000);
        }   
    }

    const printLabel = () =>{
        if(zpl !== null)
        {
            // Create a new instance of jsPDF
            const doc = new jsPDF();
            // Add ZPL content to PDF
            doc.text(zpl, 10, 10);
            // Save PDF
            doc.save('label.pdf');
            addPrintLog();
        } else {
            setNotification('No label generated. Please try again.');
            setTimeout(() => setNotification(''), 5000);
        }


    };
    const addPrintLog = async ()=>{
        const date_printed = date;
        const time_printed = getDateTime('time');
        const print_station = 'Reman';
        const userid = user.userid;
        const data = await apiWrapper('api/addLog', 'POST', {userid, time_printed,date_printed,print_station});
        console.log(data);
    }

    const handleSerial = () =>{
        const currentDate = new Date();
        if(localStorage.getItem('serialData') !== null){
            let serialData = JSON.parse(localStorage.getItem('serialData'));
            const localDate = new Date(serialData.date);
            if(localDate.getDate() === currentDate.getDate() && localDate.getMonth() === currentDate.getMonth()){
                serialData.serial += 1;
                localStorage.setItem('serialData', JSON.stringify(serialData))
                return JSON.parse(localStorage.getItem('serialData')).serial;
            } else{
                localStorage.removeItem('serialData');
                return createSerial();
            }
        } else{
            return createSerial();
        }
    };

    const createSerial = () =>{
        const currentDate = new Date();
        const serialData = {
            serial:1,
            date:currentDate,
        };
        localStorage.setItem('serialData', JSON.stringify(serialData))
        return JSON.parse(localStorage.getItem('serialData')).serial;
    };

    return(
        <div class="container-flex">
            <div>
                <NavBar></NavBar>
            </div>
            <div className="reman"> 
                <div className="reman-header">
                <h1>Reman Teardown Print Label Station</h1>
                </div>
                <div className="reman-container">
                    <label>Enter Part Number:</label>
                    <input ref={inputElement} type="text" placeholder="XXXXXX-RX" id="remanInput" onKeyDown={(e) => e.key === 'Enter' && handleReman()}></input>
                    {notification && <div className="error-message">{notification}</div>}
                    <div className="reman-label-preview">
                        <label>Label Preview:</label>
                        <img id="remanLabelPreview" src={placeholder_label} alt="label preview"></img>
                        <Button onClick={printLabel}>Print</Button>
                    </div>
                        

                </div>
                
            </div>

        </div>
    )
}