import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FileHandle from './FileHandle'

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index} = props;

  return (
    <div
      role="tabpanel"
      style={{ display: value === index ? 'block' : 'none' }}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
    >
      <Box sx={{ p: 3 }}>{children}</Box>
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `tab-${index}`,
    'aria-controls': `tabpanel-${index}`
  };
}

function DisplayTabs() {
    const [value, setValue] = React.useState(0);
    const [tabs, setTabs] = React.useState([{ label: "Tab 1", content: <FileHandle /> }]);
  
    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
      setValue(newValue);
    };

    const handleAdd = () => {
      const tabIndex = tabs.length;
      setTabs([...tabs, { 
        label: `Tab ${tabIndex + 1}`, 
        content: <FileHandle /> 
      }]);
    };

    const handleDelete = (index_to_delete: number) => {
      setTabs(prevTabs => {
        // First, remove the tab at the specified index
        const newTabs = prevTabs.filter((_, index) => index !== index_to_delete)
        setValue(value => Math.min(value, newTabs.length - 1));
        
        // Then, update the labels of the remaining tabs
        return newTabs.map((tab, index) => ({
          ...tab,
          label: `Tab ${index + 1}`
        }))
      })
    }
    
  
    return (
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs sx={{ height: "30px" }} 
                value={value} 
                onChange={handleChange} 
                aria-label="spectrogram tabs" 
                variant="scrollable" 
                scrollButtons="auto" >
            {tabs.map((tab, index) => (
                <Tab 
                  key={index} 
                  label={tab.label} 
                  {...a11yProps(index)}
                  icon={
                    <IconButton size="small" onClick={(click) => {
                      click.stopPropagation();
                      handleDelete(index);
                    }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  }
                  iconPosition="end"
                />
            ))}
            <Button variant="contained" onClick={handleAdd}>
                Add Tab
            </Button>
          </Tabs>
        </Box>
        {tabs.map((tab, index) => (
          <CustomTabPanel key={index} value={value} index={index}>
            {tab.content}
          </CustomTabPanel>
        ))}
      </Box>
    );
}

export default DisplayTabs
